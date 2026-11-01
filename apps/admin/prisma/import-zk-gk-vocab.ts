import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const SUBJECT_ID = BigInt(3); // 英语
const STAGE_MIDDLE = BigInt(2); // 初中
const STAGE_HIGH = BigInt(3); // 高中
const SOURCE = "vocab";
const OPTION_KEYS = ["A", "B", "C", "D"] as const;

interface DictWord {
  name: string;
  trans: string[];
  usphone: string;
  ukphone: string;
}

/** 剥掉释义开头的词性前缀：n. / vt.&vi. / adj. / art. 等 */
function stripPos(text: string): string {
  return text
    .replace(/^(?:\s*[a-z]{1,6}\.(?:\s*&\s*[a-z]{1,6}\.)*)+\s*/i, "")
    .trim();
}

function meaningOf(w: DictWord): string {
  return w.trans.map(stripPos).filter(Boolean).join("；");
}

/**
 * 按单词（不区分大小写）合并词表：
 * - 同一词表内重名条目合并释义
 * - 跨词表重叠词只保留一份释义（优先中考释义），同时标记两个词表归属
 */
interface MergedWord {
  name: string;
  meaning: string;
  ukphone: string;
  inMiddle: boolean;
  inHigh: boolean;
}

function mergeDicts(middle: DictWord[], high: DictWord[]): MergedWord[] {
  const byName = new Map<string, { word: MergedWord; trans: string[] }>();

  const absorb = (w: DictWord, from: "middle" | "high") => {
    const key = w.name.toLowerCase();
    const entry = byName.get(key);
    if (entry) {
      // 重叠词标记两个词表归属，但释义只保留先读到的（优先中考）
      const sameDictRepeat =
        (from === "middle" && entry.word.inMiddle && !entry.word.inHigh) ||
        (from === "high" && entry.word.inHigh && !entry.word.inMiddle);
      if (from === "middle") entry.word.inMiddle = true;
      else entry.word.inHigh = true;
      if (sameDictRepeat) entry.trans = [...entry.trans, ...w.trans];
      return;
    }
    byName.set(key, {
      word: {
        name: w.name,
        meaning: "",
        ukphone: w.ukphone,
        inMiddle: from === "middle",
        inHigh: from === "high",
      },
      trans: [...w.trans],
    });
  };

  middle.forEach((w) => absorb(w, "middle"));
  high.forEach((w) => absorb(w, "high"));

  const result: MergedWord[] = [];
  for (const { word, trans } of byName.values()) {
    word.meaning = trans.map(stripPos).filter(Boolean).join("；");
    if (!word.meaning) continue;
    result.push(word);
  }
  return result;
}

function pickDistractors(pool: string[], exclude: string, count: number): string[] {
  const picked: string[] = [];
  const seen = new Set<string>([exclude]);
  let guard = 0;
  while (picked.length < count && guard < pool.length * 5) {
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (!seen.has(candidate)) {
      seen.add(candidate);
      picked.push(candidate);
    }
    guard++;
  }
  return picked;
}

async function ensureKnowledgePoint(
  name: string,
  stageId: bigint,
): Promise<bigint> {
  const existing = await prisma.knowledgePoint.findFirst({
    where: { name, subjectId: SUBJECT_ID, stageId },
  });
  if (existing) {
    console.log(`知识点已存在: ${name} (id=${existing.id.toString()})`);
    return existing.id;
  }
  const maxSibling = await prisma.knowledgePoint.aggregate({
    where: { subjectId: SUBJECT_ID, stageId, parentId: null },
    _max: { sortOrder: true },
  });
  const kp = await prisma.knowledgePoint.create({
    data: {
      name,
      subjectId: SUBJECT_ID,
      stageId,
      parentId: null,
      sortOrder: (maxSibling._max.sortOrder ?? 0) + 1,
    },
  });
  console.log(`已创建知识点: ${name} (id=${kp.id.toString()})`);
  return kp.id;
}

async function main() {
  // 1. 知识点：中考词汇（初中）/ 高考词汇（高中）
  const middleKpId = await ensureKnowledgePoint("中考词汇", STAGE_MIDDLE);
  const highKpId = await ensureKnowledgePoint("高考词汇", STAGE_HIGH);

  // 2. 读取词表并合并
  const base = path.resolve(__dirname, "../dicts");
  const middleWords: DictWord[] = JSON.parse(
    fs.readFileSync(path.join(base, "ZhongKaoHeXin.json"), "utf-8"),
  );
  const highWords: DictWord[] = JSON.parse(
    fs.readFileSync(path.join(base, "GaoKao_3500.json"), "utf-8"),
  );
  console.log(`读取词表: 中考 ${middleWords.length} 条, 高考 ${highWords.length} 条`);

  const words = mergeDicts(middleWords, highWords);
  const middleCount = words.filter((w) => w.inMiddle).length;
  const highCount = words.filter((w) => w.inHigh).length;
  console.log(
    `合并后单词 ${words.length} 条（中考 ${middleCount} / 高考 ${highCount}，重叠 ${middleCount + highCount - words.length}）`,
  );

  // 3. 记录插入前最大题目 ID，用于精确圈定本次新增数据
  const maxIdAgg = await prisma.question.aggregate({ _max: { id: true } });
  const maxId = maxIdAgg._max.id ?? BigInt(0);
  console.log(`插入前最大题目 ID: ${maxId.toString()}`);

  // 4. 构造并插入题目（gradeId 留空：初中/高中任意年级都能刷，学段由知识点隔离）
  const contentOf = (w: MergedWord) =>
    w.ukphone ? `${w.name} /${w.ukphone}/` : w.name;
  const questionData = words.map((w) => ({
    gradeId: null,
    subjectId: SUBJECT_ID,
    type: 1,
    content: contentOf(w),
    analysis: "",
    difficulty: 1,
    score: 1,
    sortOrder: 0,
    source: SOURCE,
  }));
  const created = await prisma.question.createMany({ data: questionData });
  console.log(`插入题目: ${created.count} 条`);

  // 5. 回查本次新插入的题目
  const inserted = await prisma.question.findMany({
    where: { id: { gt: maxId } },
    select: { id: true, content: true },
    orderBy: { id: "asc" },
  });
  const idsByContent = new Map<string, bigint[]>();
  for (const q of inserted) {
    const list = idsByContent.get(q.content);
    if (list) list.push(q.id);
    else idsByContent.set(q.content, [q.id]);
  }
  console.log(`回查到新题目: ${inserted.length} 条`);

  // 6. 构造选项 + 知识点关联（共享题目：同一单词同时挂中考/高考两个知识点）
  const transPool = words.map((w) => w.meaning);
  const optionRows: Array<{
    questionId: bigint;
    optionKey: string;
    content: string;
    isCorrect: boolean;
    sortNo: number;
  }> = [];
  const kpRows: Array<{ questionId: bigint; knowledgePointId: bigint }> = [];

  for (const w of words) {
    const queue = idsByContent.get(contentOf(w));
    const questionId = queue?.shift();
    if (!questionId) {
      console.warn(`未找到题目: ${w.name}`);
      continue;
    }
    if (w.inMiddle) kpRows.push({ questionId, knowledgePointId: middleKpId });
    if (w.inHigh) kpRows.push({ questionId, knowledgePointId: highKpId });

    const correctText = w.meaning;
    const correctIdx = Math.floor(Math.random() * OPTION_KEYS.length);
    const distractors = pickDistractors(
      transPool,
      correctText,
      OPTION_KEYS.length - 1,
    );
    let di = 0;
    for (let i = 0; i < OPTION_KEYS.length; i++) {
      const isCorrect = i === correctIdx;
      const content = isCorrect ? correctText : distractors[di++];
      optionRows.push({
        questionId,
        optionKey: OPTION_KEYS[i],
        content,
        isCorrect,
        sortNo: i + 1,
      });
    }
  }

  const optCreated = await prisma.questionOption.createMany({ data: optionRows });
  console.log(`插入选项: ${optCreated.count} 条`);
  const kpCreated = await prisma.questionKnowledgePoint.createMany({ data: kpRows });
  console.log(`插入知识点关联: ${kpCreated.count} 条`);

  // 7. 校验
  const middleTotal = await prisma.questionKnowledgePoint.count({
    where: { knowledgePointId: middleKpId },
  });
  const highTotal = await prisma.questionKnowledgePoint.count({
    where: { knowledgePointId: highKpId },
  });
  const newQuestions = await prisma.question.count({ where: { id: { gt: maxId } } });
  const optTotal = await prisma.questionOption.count({
    where: { question: { id: { gt: maxId } } },
  });
  const correctOpt = await prisma.questionOption.count({
    where: { isCorrect: true, question: { id: { gt: maxId } } },
  });
  console.log(
    `校验: 新增题目 ${newQuestions} 条, 选项 ${optTotal} 条, 正确选项 ${correctOpt} 条`,
  );
  console.log(
    `校验: 中考词汇 ${middleTotal} 题, 高考词汇 ${highTotal} 题, 关联合计 ${middleTotal + highTotal}（期望 ${middleCount + highCount}）`,
  );
}

main()
  .catch((e) => {
    console.error("导入失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

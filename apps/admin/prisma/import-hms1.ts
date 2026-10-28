import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const CATEGORY_ID = BigInt(36);
const SUBJECT_ID = BigInt(3);
const KNOWLEDGE_POINT_ID = BigInt(13);
const OPTION_KEYS = ["A", "B", "C", "D"] as const;

interface DictWord {
  name: string;
  trans: string[];
  usphone: string;
  ukphone: string;
}

function pickDistractors(pool: string[], exclude: string, count: number): string[] {
  const picked: string[] = [];
  const seen = new Set<string>([exclude]);
  let guard = 0;
  while (picked.length < count && guard < pool.length * 3) {
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (!seen.has(candidate)) {
      seen.add(candidate);
      picked.push(candidate);
    }
    guard++;
  }
  return picked;
}

async function main() {
  // 1. 读取词典
  const dictPath = path.resolve(__dirname, "../dicts/hms1.json");
  const raw = fs.readFileSync(dictPath, "utf-8");
  const allWords: DictWord[] = JSON.parse(raw);
  console.log(`读取到 ${allWords.length} 个单词`);

  // 2. 校验目标分类 / 科目 / 知识点存在
  const cat = await prisma.category.findUnique({ where: { id: CATEGORY_ID } });
  if (!cat) throw new Error(`category ${CATEGORY_ID} 不存在`);
  const sub = await prisma.subject.findUnique({ where: { id: SUBJECT_ID } });
  if (!sub) throw new Error(`subject ${SUBJECT_ID} 不存在`);
  const kp = await prisma.knowledgePoint.findUnique({ where: { id: KNOWLEDGE_POINT_ID } });
  if (!kp) throw new Error(`knowledgePoint ${KNOWLEDGE_POINT_ID} 不存在`);

  // 3. 过滤该分类下已存在的同名词条，避免重复执行脚本时重复插入
  const contentOf = (w: DictWord) =>
    w.ukphone ? `${w.name} /${w.ukphone}/` : w.name;
  const existing = await prisma.question.findMany({
    where: { categoryId: CATEGORY_ID },
    select: { content: true },
  });
  const existingContents = new Set(existing.map((q: { content: string }) => q.content));
  const words = allWords.filter((w) => !existingContents.has(contentOf(w)));
  const skipped = allWords.length - words.length;
  if (skipped > 0) console.log(`跳过已存在词条: ${skipped} 条`);
  if (words.length === 0) {
    console.log("没有需要导入的词条，退出");
    return;
  }

  // 4. 记录插入前的最大题目 id，用于定位本次新增数据
  const before = await prisma.question.aggregate({
    where: { categoryId: CATEGORY_ID },
    _max: { id: true },
  });
  const maxIdBefore = before._max.id ?? BigInt(0);

  // 5. 构造题目（先不插选项）
  // content = 单词 + 空格 + 英式音标，如 "explosive /ɪk'spləusɪv/"；音标缺失时只用单词
  // sortOrder 递增赋值，避免大量并列导致单元窗口顺序不稳定
  const questionData = words.map((w, index) => ({
    categoryId: CATEGORY_ID,
    subjectId: SUBJECT_ID,
    type: 1,
    content: contentOf(w),
    analysis: "",
    difficulty: 1,
    score: 1,
    sortOrder: index,
  }));

  // 6. 批量插入题目
  const created = await prisma.question.createMany({ data: questionData });
  console.log(`插入题目: ${created.count} 条`);

  // 7. 回查本次新增题目 id
  const inserted = await prisma.question.findMany({
    where: { categoryId: CATEGORY_ID, id: { gt: maxIdBefore } },
    select: { id: true, content: true },
    orderBy: { id: "asc" },
  });

  // content 可能存在重复，建立 content -> id 队列，按插入顺序逐个取出
  const idQueues = new Map<string, bigint[]>();
  for (const q of inserted) {
    const queue = idQueues.get(q.content) ?? [];
    queue.push(q.id);
    idQueues.set(q.content, queue);
  }

  // 8. 构造选项 + 知识点关联
  const transPool = [...new Set(words.map((w) => w.trans.join("；")))];
  const optionRows: Array<{
    questionId: bigint;
    optionKey: string;
    content: string;
    isCorrect: boolean;
    sortNo: number;
  }> = [];
  const kpRows: Array<{ questionId: bigint; knowledgePointId: bigint }> = [];

  for (const w of words) {
    const questionId = idQueues.get(contentOf(w))?.shift();
    if (!questionId) {
      console.warn(`未找到题目: ${w.name}`);
      continue;
    }
    kpRows.push({ questionId, knowledgePointId: KNOWLEDGE_POINT_ID });

    const correctText = w.trans.join("；");
    const correctIdx = Math.floor(Math.random() * OPTION_KEYS.length);
    const distractors = pickDistractors(transPool, correctText, OPTION_KEYS.length - 1);

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

  // 9. 批量插入选项
  const optCreated = await prisma.questionOption.createMany({ data: optionRows });
  console.log(`插入选项: ${optCreated.count} 条`);

  // 10. 批量插入知识点关联
  const kpCreated = await prisma.questionKnowledgePoint.createMany({ data: kpRows });
  console.log(`插入知识点关联: ${kpCreated.count} 条`);

  // 11. 校验统计（仅统计本次新增的题目）
  const total = await prisma.question.count({
    where: { categoryId: CATEGORY_ID, id: { gt: maxIdBefore } },
  });
  const optTotal = await prisma.questionOption.count({
    where: { question: { categoryId: CATEGORY_ID, id: { gt: maxIdBefore } } },
  });
  const correctOpt = await prisma.questionOption.count({
    where: { question: { categoryId: CATEGORY_ID, id: { gt: maxIdBefore } }, isCorrect: true },
  });
  console.log(
    `校验: 题目 ${total} 条, 选项 ${optTotal} 条, 正确选项 ${correctOpt} 条 (期望 ${total})`
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

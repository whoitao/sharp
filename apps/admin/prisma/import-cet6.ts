import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const GRADE_ID = BigInt(13);
const SUBJECT_ID = BigInt(3);
const KNOWLEDGE_POINT_ID = BigInt(11); // CET-6
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
  const dictPath = path.resolve(__dirname, "../../admin/dicts/CET6_T.json");
  const raw = fs.readFileSync(dictPath, "utf-8");
  const words: DictWord[] = JSON.parse(raw);
  console.log(`读取到 ${words.length} 个单词`);

  // 2. 校验目标分类 / 科目 / 知识点存在
  const grade = await prisma.grade.findUnique({ where: { id: GRADE_ID } });
  if (!grade) throw new Error(`grade  不存在`);
  const sub = await prisma.subject.findUnique({ where: { id: SUBJECT_ID } });
  if (!sub) throw new Error(`subject ${SUBJECT_ID} 不存在`);
  const kp = await prisma.knowledgePoint.findUnique({ where: { id: KNOWLEDGE_POINT_ID } });
  if (!kp) throw new Error(`knowledgePoint ${KNOWLEDGE_POINT_ID} 不存在`);

  // 3. 记录插入前的最大题目 ID，用于精确匹配本次新插入的题目
  const maxIdBefore = await prisma.question.aggregate({
    _max: { id: true },
  });
  const maxId = maxIdBefore._max.id ?? BigInt(0);
  console.log(`插入前最大题目 ID: ${maxId.toString()}`);

  // 4. 构造题目（先不插选项）
  const contentOf = (w: DictWord) =>
    w.ukphone ? `${w.name} /${w.ukphone}/` : w.name;
  const questionData = words.map((w) => ({
    gradeId: GRADE_ID,
    subjectId: SUBJECT_ID,
    type: 1,
    content: contentOf(w),
    analysis: "",
    difficulty: 1,
    score: 1,
    sortOrder: 0,
  }));

  // 5. 批量插入题目
  const created = await prisma.question.createMany({ data: questionData });
  console.log(`插入题目: ${created.count} 条`);

  // 6. 回查本次新插入的题目 id（仅取 id > maxId，避免与已有的 CET4 题目冲突）
  const inserted = await prisma.question.findMany({
    where: { id: { gt: maxId } },
    select: { id: true, content: true },
    orderBy: { id: "asc" },
  });
  // content 允许重复：同一 content 对应多个 id 时按插入顺序入队，消费时依次取出
  const idsByContent = new Map<string, bigint[]>();
  for (const q of inserted) {
    const list = idsByContent.get(q.content);
    if (list) list.push(q.id);
    else idsByContent.set(q.content, [q.id]);
  }
  console.log(`回查到新题目: ${inserted.length} 条`);

  // 7. 构造选项 + 知识点关联
  const transPool = words.map((w) => w.trans.join("；"));
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

  // 8. 批量插入选项
  const optCreated = await prisma.questionOption.createMany({ data: optionRows });
  console.log(`插入选项: ${optCreated.count} 条`);

  // 9. 批量插入知识点关联
  const kpCreated = await prisma.questionKnowledgePoint.createMany({ data: kpRows });
  console.log(`插入知识点关联: ${kpCreated.count} 条`);

  // 10. 校验统计
  const cet6Count = await prisma.question.count({
    where: {
      gradeId: GRADE_ID,
      knowledgePoints: { some: { knowledgePointId: KNOWLEDGE_POINT_ID } },
    },
  });
  const optTotal = await prisma.questionOption.count({
    where: {
      question: {
        knowledgePoints: { some: { knowledgePointId: KNOWLEDGE_POINT_ID } },
      },
    },
  });
  const correctOpt = await prisma.questionOption.count({
    where: {
      isCorrect: true,
      question: {
        knowledgePoints: { some: { knowledgePointId: KNOWLEDGE_POINT_ID } },
      },
    },
  });
  console.log(
    `校验: CET-6 题目 ${cet6Count} 条, 选项 ${optTotal} 条, 正确选项 ${correctOpt} 条 (期望 ${cet6Count})`
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

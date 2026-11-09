import { PrismaClient } from "@prisma/client";
import type { RawQuestion } from "./data/types";
import { grade1MathPart1 } from "./data/grade1-math-part1";
import { grade1MathPart2 } from "./data/grade1-math-part2";
import { grade1MathPart3 } from "./data/grade1-math-part3";
import { grade1MathPart4 } from "./data/grade1-math-part4";

const prisma = new PrismaClient();

const GRADE_ID = BigInt(1);
const SUBJECT_ID = BigInt(2); // 数学
const STAGE_ID = BigInt(1); // 小学
const PUB_ID = BigInt(7); // 青岛版
const SOURCE = "textbook";
const BATCH = 8;

const questions: RawQuestion[] = [
  ...grade1MathPart1,
  ...grade1MathPart2,
  ...grade1MathPart3,
  ...grade1MathPart4,
];

async function main() {
  console.log(`=== 准备写入 ${questions.length} 道一年级数学单选 ===\n`);

  // 1. 加载章节映射
  console.log("=== Step 1: 加载章节映射 ===");
  const textbooks = await prisma.textbook.findMany({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, publisherId: PUB_ID },
    select: { id: true, name: true },
  });
  for (const t of textbooks) console.log(`  教材: id=${t.id} ${t.name}`);
  const tbIds = textbooks.map(t => t.id);
  const chapters = await prisma.chapter.findMany({
    where: { textbookId: { in: tbIds } },
    select: { id: true, name: true, level: true },
  });
  const l2Map = new Map<string, bigint>();
  const l1Map = new Map<string, bigint>();
  for (const c of chapters) {
    if (c.level === 2) l2Map.set(c.name, c.id);
    else l1Map.set(c.name, c.id);
  }
  console.log(`  L2: ${l2Map.size}, L1: ${l1Map.size}`);

  // 2. 加载知识点映射
  console.log("\n=== Step 2: 加载知识点映射 ===");
  const allKP = await prisma.knowledgePoint.findMany({
    where: { subjectId: SUBJECT_ID, stageId: STAGE_ID },
    select: { id: true, name: true },
  });
  const kpMap = new Map<string, bigint>();
  for (const k of allKP) if (!kpMap.has(k.name)) kpMap.set(k.name, k.id);
  console.log(`  知识点: ${kpMap.size} 个`);

  // 3. 清理旧数据
  console.log("\n=== Step 3: 清理旧数据 ===");
  const oldQ = await prisma.question.findMany({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE },
    select: { id: true },
  });
  const oldIds = oldQ.map(q => q.id);
  if (oldIds.length > 0) {
    await prisma.userQuestionProgress.deleteMany({ where: { questionId: { in: oldIds } } });
    await prisma.studyAttemptItem.deleteMany({ where: { questionId: { in: oldIds } } });
    await prisma.questionTagLink.deleteMany({ where: { questionId: { in: oldIds } } });
    await prisma.questionOption.deleteMany({ where: { questionId: { in: oldIds } } });
    await prisma.questionKnowledgePoint.deleteMany({ where: { questionId: { in: oldIds } } });
    await prisma.question.deleteMany({ where: { id: { in: oldIds } } });
    console.log(`  已删除 ${oldIds.length} 条旧数据`);
  } else {
    console.log(`  无旧数据需要清理`);
  }

  // 4. 分批并发写入
  console.log(`\n=== Step 4: 分批并发写入 ${questions.length} 道 ===`);
  let success = 0;
  let skipped: string[] = [];
  const start = Date.now();

  for (let batchStart = 0; batchStart < questions.length; batchStart += BATCH) {
    const batch = questions.slice(batchStart, batchStart + BATCH);
    const created = await Promise.all(
      batch.map(async (q, idx) => {
        const globalIdx = batchStart + idx;
        let chapterId: bigint | null = null;
        if (q.chapterName) {
          chapterId = l2Map.get(q.chapterName) ?? l1Map.get(q.chapterName) ?? null;
          if (chapterId === null) skipped.push(`[${globalIdx + 1}] 章节未匹配: ${q.chapterName}`);
        }
        const kpIds: bigint[] = [];
        if (q.kpNames) {
          for (const name of q.kpNames) {
            const id = kpMap.get(name);
            if (id) kpIds.push(id);
            else skipped.push(`[${globalIdx + 1}] 知识点未匹配: ${name}`);
          }
        }

        const question = await prisma.question.create({
          data: {
            type: q.type, content: q.content,
            analysis: q.analysis ?? null,
            difficulty: q.difficulty ?? 1,
            score: q.score ?? 1,
            gradeId: GRADE_ID, subjectId: SUBJECT_ID,
            chapterId, source: SOURCE,
            sortOrder: globalIdx + 1,
          },
        });

        const writes: Promise<unknown>[] = [];
        if (q.options.length > 0) {
          writes.push(prisma.questionOption.createMany({
            data: q.options.map(opt => ({
              questionId: question.id, optionKey: opt.key,
              content: opt.content, isCorrect: opt.isCorrect,
              sortNo: opt.key.charCodeAt(0) - 65,
            })),
          }));
        }
        if (kpIds.length > 0) {
          writes.push(prisma.questionKnowledgePoint.createMany({
            data: kpIds.map(kpId => ({ questionId: question.id, knowledgePointId: kpId })),
            skipDuplicates: true,
          }));
        }
        await Promise.all(writes);
        return question;
      }),
    );

    success += created.length;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ${success}/${questions.length}  (${elapsed}s)`);
  }

  // 5. 汇总
  console.log(`\n=== 完成: ${success} 道 (总耗时 ${((Date.now() - start) / 1000).toFixed(1)}s) ===`);
  console.log(`未匹配警告: ${skipped.length}`);
  if (skipped.length > 0) {
    const unique = [...new Set(skipped)];
    console.log("  详情:");
    for (const s of unique) console.log(`    ⚠️ ${s}`);
  }

  const finalCount = await prisma.question.count({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE },
  });
  const optCount = await prisma.questionOption.count({
    where: { question: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE } },
  });
  const kpLinkCount = await prisma.questionKnowledgePoint.count({
    where: { question: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE } },
  });
  console.log(`\n最终统计: 题目=${finalCount} 选项=${optCount} 知识点关联=${kpLinkCount}`);

  // 章节分布
  const dist = await prisma.question.groupBy({
    by: ["chapterId"],
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE },
    _count: { _all: true },
  });
  const chapterNames = await prisma.chapter.findMany({
    where: { id: { in: dist.map(d => d.chapterId).filter((x): x is bigint => x !== null) } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(chapterNames.map(c => [String(c.id), c.name]));
  console.log("\n章节分布:");
  for (const d of dist.sort((a, b) => b._count._all - a._count._all)) {
    const n = d.chapterId === null ? "(未关联)" : (nameMap.get(String(d.chapterId)) ?? String(d.chapterId));
    console.log(`  ${n}: ${d._count._all}`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

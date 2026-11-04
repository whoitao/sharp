import { PrismaClient } from "@prisma/client";
import { part1Questions } from "./data/grade8-cn-part1";
import { part2Questions } from "./data/grade8-cn-part2";

const prisma = new PrismaClient();

const GRADE_ID = BigInt(8);
const SUBJECT_ID = BigInt(1); // 语文
const STAGE_ID = BigInt(2);
const SOURCE = "textbook";
const BATCH = 8;
const TOTAL = 200;

async function main() {
  const all = [...part1Questions, ...part2Questions].slice(0, TOTAL);
  console.log(`=== 准备写入 ${all.length} 道初二语文单选 ===\n`);

  // 1. 加载章节
  console.log("=== Step 1: 加载章节映射 ===");
  const textbooks = await prisma.textbook.findMany({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID },
    select: { id: true, name: true, semester: true },
  });
  for (const t of textbooks) console.log(`  教材: id=${t.id} sem=${t.semester} ${t.name}`);
  const tbIds = textbooks.map((t) => t.id);
  const chapters = await prisma.chapter.findMany({
    where: { textbookId: { in: tbIds } },
    select: { id: true, name: true, level: true },
  });
  const l1Map = new Map<string, bigint>();
  for (const c of chapters) l1Map.set(c.name, c.id);
  console.log(`  L1 章节: ${l1Map.size}`);

  // 2. 加载知识点
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
  const oldIds = oldQ.map((q) => q.id);
  if (oldIds.length > 0) {
    await prisma.questionOption.deleteMany({ where: { questionId: { in: oldIds } } });
    await prisma.questionKnowledgePoint.deleteMany({ where: { questionId: { in: oldIds } } });
    await prisma.question.deleteMany({ where: { id: { in: oldIds } } });
    console.log(`  已删除 ${oldIds.length} 条旧数据`);
  } else {
    console.log(`  无旧数据需要清理`);
  }

  // 4. 分批写入
  console.log(`\n=== Step 4: 分批并发写入 ${all.length} 道 ===`);
  let success = 0;
  let skipped: string[] = [];
  const start = Date.now();

  for (let batchStart = 0; batchStart < all.length; batchStart += BATCH) {
    const batch = all.slice(batchStart, batchStart + BATCH);
    const created = await Promise.all(
      batch.map(async (q, idx) => {
        const globalIdx = batchStart + idx;

        let chapterId: bigint | null = null;
        if (q.chapterName) {
          chapterId = l1Map.get(q.chapterName) ?? null;
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
            type: q.type,
            content: q.content,
            analysis: q.analysis ?? null,
            difficulty: q.difficulty ?? 1,
            score: q.score ?? 1,
            gradeId: GRADE_ID,
            subjectId: SUBJECT_ID,
            chapterId,
            source: SOURCE,
            sortOrder: globalIdx + 1,
          },
        });

        const writes: Promise<unknown>[] = [];
        if (q.options.length > 0) {
          writes.push(
            prisma.questionOption.createMany({
              data: q.options.map((opt) => ({
                questionId: question.id,
                optionKey: opt.key,
                content: opt.content,
                isCorrect: opt.isCorrect,
                sortNo: opt.key.charCodeAt(0) - 65,
              })),
            }),
          );
        }
        if (kpIds.length > 0) {
          writes.push(
            prisma.questionKnowledgePoint.createMany({
              data: kpIds.map((kpId) => ({ questionId: question.id, knowledgePointId: kpId })),
              skipDuplicates: true,
            }),
          );
        }
        await Promise.all(writes);
        return question;
      }),
    );

    success += created.length;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ${success}/${all.length}  (${elapsed}s)`);
  }

  console.log(`\n=== 完成: ${success} 道 (总耗时 ${((Date.now() - start) / 1000).toFixed(1)}s) ===`);
  console.log(`未匹配警告: ${skipped.length}`);
  if (skipped.length > 0) {
    const unique = [...new Set(skipped)];
    for (const s of unique.slice(0, 20)) console.log(`  ⚠️ ${s}`);
  }

  const qCount = await prisma.question.count({ where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE } });
  const optCount = await prisma.questionOption.count({
    where: { question: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE } },
  });
  const kpCount = await prisma.questionKnowledgePoint.count({
    where: { question: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE } },
  });
  console.log(`\n最终统计: 题目=${qCount} 选项=${optCount} 知识点关联=${kpCount}`);

  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

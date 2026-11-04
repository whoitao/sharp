import { PrismaClient } from "@prisma/client";
import { part1Questions } from "./data/grade8-english-part1";
import { part2Questions } from "./data/grade8-english-part2";

const prisma = new PrismaClient();

// ─── 初二英语配置 ───
const GRADE_ID = BigInt(8);
const SUBJECT_ID = BigInt(3);
const STAGE_ID = BigInt(2);
const SOURCE = "textbook";
const BATCH = 8; // Supabase pool 9 connections
const TOTAL = 200; // 入库 200 题

async function main() {
  const all = [...part1Questions, ...part2Questions].slice(0, TOTAL);
  console.log(`=== 准备写入 ${all.length} 道初二英语单选 (每批${BATCH}题并发) ===\n`);

  // Step 1: 加载章节映射（初二英语只有 L1，没有 L2）
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
  // 初二英语只有 L1，但保留 L2→L1 fallback 逻辑
  const l2Map = new Map<string, bigint>();
  const l1Map = new Map<string, bigint>();
  for (const c of chapters) {
    if (c.level === 2) l2Map.set(c.name, c.id);
    else l1Map.set(c.name, c.id);
  }
  console.log(`  L2 章节: ${l2Map.size}, L1 章节: ${l1Map.size}`);

  // Step 2: 加载知识点映射
  console.log("\n=== Step 2: 加载知识点映射 ===");
  const allKP = await prisma.knowledgePoint.findMany({
    where: { subjectId: SUBJECT_ID, stageId: STAGE_ID },
    select: { id: true, name: true },
  });
  const kpMap = new Map<string, bigint>();
  for (const k of allKP) if (!kpMap.has(k.name)) kpMap.set(k.name, k.id);
  console.log(`  知识点: ${kpMap.size} 个 (subject=3 英语 stage=2 初中)`);

  // Step 3: 清理旧数据（先删子表，再删主表）
  console.log("\n=== Step 3: 清理旧数据 ===");
  const oldQ = await prisma.question.findMany({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE },
    select: { id: true },
  });
  const oldIds = oldQ.map((q) => q.id);
  if (oldIds.length > 0) {
    await prisma.questionOption.deleteMany({ where: { questionId: { in: oldIds } } });
    await prisma.questionKnowledgePoint.deleteMany({ where: { questionId: { in: oldIds } } });
    const d = await prisma.question.deleteMany({ where: { id: { in: oldIds } } });
    console.log(`  删除旧题目: ${d.count} 条 + 关联数据`);
  } else {
    console.log(`  无旧数据需要清理（初二英语题库为空）`);
  }

  // Step 4: 分批并发写入
  console.log(`\n=== Step 4: 分批并发写入 ${all.length} 道题目 ===`);
  let success = 0;
  let skipped: string[] = [];
  const start = Date.now();

  for (let batchStart = 0; batchStart < all.length; batchStart += BATCH) {
    const batch = all.slice(batchStart, batchStart + BATCH);

    const created = await Promise.all(
      batch.map(async (q, idx) => {
        const globalIdx = batchStart + idx;

        // 章节匹配: 先 L2 后 L1
        let chapterId: bigint | null = null;
        if (q.chapterName) {
          chapterId = l2Map.get(q.chapterName) ?? l1Map.get(q.chapterName) ?? null;
          if (chapterId === null) skipped.push(`[${globalIdx + 1}] 章节未匹配: ${q.chapterName}`);
        }

        // 知识点匹配
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

        // Options + KPLink 并发写入
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
    console.log(`  批次完成: ${success}/${all.length}  (${elapsed}s)`);
  }

  // Step 5: 汇总
  console.log(`\n=== 完成: ${success} 道 (总耗时 ${((Date.now() - start) / 1000).toFixed(1)}s) ===`);
  console.log(`未匹配警告: ${skipped.length}`);
  if (skipped.length > 0) {
    const unique = [...new Set(skipped)];
    console.log("  详情:");
    for (const s of unique.slice(0, 15)) console.log(`    ⚠️ ${s}`);
    if (unique.length > 15) console.log(`    ...还有 ${unique.length - 15} 条`);
  }

  // Step 6: 最终统计
  const finalCount = await prisma.question.count({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE },
  });
  const optCount = await prisma.questionOption.count({
    where: { question: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE } },
  });
  const kpLinkCount = await prisma.questionKnowledgePoint.count({
    where: { question: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, source: SOURCE } },
  });
  console.log(`\n最终统计:`);
  console.log(`  题目: ${finalCount}`);
  console.log(`  选项: ${optCount}`);
  console.log(`  知识点关联: ${kpLinkCount}`);

  // 章节分布
  const chapterStats = await prisma.chapter
    .findMany({
      where: { textbookId: { in: tbIds } },
      include: { _count: { select: { questions: { where: { source: SOURCE } } } } },
      orderBy: [{ textbookId: "asc" }, { name: "asc" }],
    })
    .catch(() => null);
  if (chapterStats) {
    console.log(`\n章节分布:`);
    for (const c of chapterStats) {
      console.log(`  ${c.name}: ${c._count.questions} 题`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

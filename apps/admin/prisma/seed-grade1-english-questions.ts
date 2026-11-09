import { PrismaClient } from "@prisma/client";
import type { RawQuestion } from "./data/types";
import { grade1EnglishPart1 } from "./data/grade1-english-part1";
import { grade1EnglishPart2 } from "./data/grade1-english-part2";
import { grade1EnglishPart3 } from "./data/grade1-english-part3";
import { grade1EnglishPart4 } from "./data/grade1-english-part4";

const prisma = new PrismaClient();

const GRADE_ID = BigInt(1); // 一年级
const SUBJECT_ID = BigInt(3); // 英语
const STAGE_ID = BigInt(1); // 小学
const SOURCE = "textbook";
const BATCH = 8;
const EXPECTED_TOTAL = 400;

const questions: RawQuestion[] = [
  ...grade1EnglishPart1,
  ...grade1EnglishPart2,
  ...grade1EnglishPart3,
  ...grade1EnglishPart4,
];

/** 删除题目及其所有依赖数据（作答记录、学习进度、收藏、选项、知识点；标签关联由数据库级联删除） */
async function deleteQuestions(ids: bigint[]) {
  if (ids.length === 0) return;
  await prisma.userQuestionProgress.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.studyAttemptItem.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.userQuestionFavorite.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.questionOption.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.questionKnowledgePoint.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.question.deleteMany({ where: { id: { in: ids } } });
}

function validateData() {
  const errors: string[] = [];
  if (questions.length !== EXPECTED_TOTAL) {
    errors.push(`题目总数应为 ${EXPECTED_TOTAL}，实际 ${questions.length}`);
  }
  const seen = new Map<string, number>();
  questions.forEach((q, idx) => {
    const no = idx + 1;
    const correct = q.options.filter(o => o.isCorrect);
    if (q.type === 1) {
      if (q.options.length !== 4) errors.push(`[${no}] 单选应有 4 个选项，实际 ${q.options.length}`);
      if (correct.length !== 1) errors.push(`[${no}] 单选应且仅应有 1 个正确选项，实际 ${correct.length}`);
    } else if (q.type === 2) {
      if (q.options.length < 2) errors.push(`[${no}] 多选至少 2 个选项`);
      if (correct.length < 2) errors.push(`[${no}] 多选至少 2 个正确选项`);
    } else if (q.type === 3) {
      if (q.options.length !== 2) errors.push(`[${no}] 判断应有 2 个选项，实际 ${q.options.length}`);
      if (correct.length !== 1) errors.push(`[${no}] 判断应且仅应有 1 个正确选项，实际 ${correct.length}`);
    } else {
      errors.push(`[${no}] 未知题型: ${q.type}`);
    }
    if (!q.content.trim()) errors.push(`[${no}] 题干为空`);
    if (!q.analysis?.trim()) errors.push(`[${no}] 缺少解析`);
    if (!q.chapterName) errors.push(`[${no}] 缺少章节`);
    if (!q.semester) errors.push(`[${no}] 缺少 semester`);
    if (!q.kpNames || q.kpNames.length === 0) errors.push(`[${no}] 缺少知识点`);
    if (seen.has(q.content)) errors.push(`[${no}] 题干与第 ${seen.get(q.content)} 题重复: ${q.content}`);
    else seen.set(q.content, no);
  });
  if (errors.length > 0) {
    throw new Error(`数据校验未通过（${errors.length} 处）：\n  - ${errors.slice(0, 30).join("\n  - ")}`);
  }
}

async function main() {
  const rollback = process.argv.includes("--rollback");

  if (rollback) {
    const contents = questions.map(q => q.content);
    const existing = await prisma.question.findMany({
      where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, content: { in: contents } },
      select: { id: true },
    });
    const ids = existing.map(q => q.id);
    await deleteQuestions(ids);
    console.log(`已回滚：按题干匹配删除 ${ids.length} 道题目。`);
    return;
  }

  console.log(`=== 一年级英语题库写入（目标 ${EXPECTED_TOTAL} 道）===\n`);
  validateData();
  console.log(`数据校验通过：${questions.length} 道，题干无重复，选项/解析/章节/知识点完整。`);

  // 1. 核对教材与章节
  console.log("\n=== Step 1: 核对教材与章节 ===");
  const textbooks = await prisma.textbook.findMany({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID },
    select: { id: true, name: true, semester: true, publisher: { select: { name: true } } },
    orderBy: { semester: "asc" },
  });
  if (textbooks.length === 0) throw new Error("未找到一年级英语教材，请先执行教材章节 seed。");
  for (const t of textbooks) console.log(`  教材: id=${t.id} ${t.name} [${t.publisher.name}] 学期=${t.semester}`);

  const chosen = textbooks.filter(t => t.publisher.name.includes("外研"));
  if (chosen.length === 0) throw new Error("未找到外研版一年级英语教材。");
  console.log(`  选用: 外研版（一起点）共 ${chosen.length} 册`);

  const tbIds = chosen.map(t => t.id);
  const chapters = await prisma.chapter.findMany({
    where: { textbookId: { in: tbIds } },
    select: { id: true, name: true, level: true, textbookId: true, parentId: true },
  });
  if (chapters.length === 0) throw new Error("所选教材没有章节数据。");

  const tbSemester = new Map(chosen.map(t => [String(t.id), t.semester]));
  const l2Map = new Map<string, bigint>(); // `${semester}|${name}`
  const l1Map = new Map<string, bigint>();
  for (const c of chapters) {
    const sem = tbSemester.get(String(c.textbookId));
    const key = `${sem}|${c.name}`;
    if (c.level === 2) l2Map.set(key, c.id);
    else l1Map.set(key, c.id);
  }
  console.log(`  章节: L1=${l1Map.size}, L2=${l2Map.size}`);

  // 2. 核对知识点
  console.log("\n=== Step 2: 核对知识点 ===");
  const allKP = await prisma.knowledgePoint.findMany({
    where: { subjectId: SUBJECT_ID, stageId: STAGE_ID },
    select: { id: true, name: true },
  });
  const kpMap = new Map<string, bigint>();
  for (const k of allKP) if (!kpMap.has(k.name)) kpMap.set(k.name, k.id);
  console.log(`  可用知识点: ${allKP.length} 个（去重名称 ${kpMap.size} 个）`);

  // 3. 预检章节/知识点匹配，任何缺失直接报错，不写入
  console.log("\n=== Step 3: 预检章节与知识点匹配 ===");
  const missing: string[] = [];
  questions.forEach((q, idx) => {
    const no = idx + 1;
    const key = `${q.semester}|${q.chapterName}`;
    if (!l2Map.has(key) && !l1Map.has(key)) missing.push(`[${no}] 章节未找到: ${q.semester === 1 ? "上册" : "下册"} · ${q.chapterName}`);
    for (const name of q.kpNames ?? []) {
      if (!kpMap.has(name)) missing.push(`[${no}] 知识点未找到: ${name}`);
    }
  });
  if (missing.length > 0) {
    throw new Error(`预检失败（${missing.length} 处），已停止写入：\n  - ${[...new Set(missing)].slice(0, 30).join("\n  - ")}`);
  }
  console.log("  章节与知识点全部匹配成功。");

  // 4. 幂等准备：按题干 + 章节判重（不依赖标签）
  console.log("\n=== Step 4: 检查已有数据（幂等）===");
  const desiredContents = new Set(questions.map(q => q.content));
  const existingQuestions = await prisma.question.findMany({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, content: { in: [...desiredContents] } },
    select: { id: true, content: true, chapterId: true },
  });
  const existingByContent = new Map<string, bigint>();
  for (const q of existingQuestions) existingByContent.set(q.content, q.id);
  console.log(`  已存在题干匹配 ${existingQuestions.length} 道`);

  // 章节不一致的历史题目就地修正（同年级同科目、题干相同即视为同题）
  const chapterIdByContent = new Map<string, bigint | null>();
  for (const q of questions) {
    const key = `${q.semester}|${q.chapterName}`;
    chapterIdByContent.set(q.content, l2Map.get(key) ?? l1Map.get(key) ?? null);
  }
  let repairCount = 0;
  for (const e of existingQuestions) {
    const expect = chapterIdByContent.get(e.content) ?? null;
    if (String(expect) !== String(e.chapterId)) {
      await prisma.question.update({ where: { id: e.id }, data: { chapterId: expect } });
      repairCount++;
    }
  }
  if (repairCount > 0) console.log(`  修正章节不一致 ${repairCount} 道`);

  const pending = questions.filter(q => !existingByContent.has(q.content));
  console.log(`  本次待插入 ${pending.length} 道，已存在跳过 ${questions.length - pending.length} 道`);

  // 5. 分批并发写入
  console.log(`\n=== Step 5: 写入 ${pending.length} 道 ===`);
  let success = 0;
  const insertedIds: bigint[] = [];
  const start = Date.now();

  for (let batchStart = 0; batchStart < pending.length; batchStart += BATCH) {
    const batch = pending.slice(batchStart, batchStart + BATCH);
    const created = await Promise.all(
      batch.map(async (q) => {
        const key = `${q.semester}|${q.chapterName}`;
        const chapterId = l2Map.get(key) ?? l1Map.get(key) ?? null;
        const kpIds = [...new Set((q.kpNames ?? []).map(name => kpMap.get(name)!))];
        const globalIdx = questions.findIndex(x => x.content === q.content);

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

        const writes: Promise<unknown>[] = [
          prisma.questionOption.createMany({
            data: q.options.map(opt => ({
              questionId: question.id,
              optionKey: opt.key,
              content: opt.content,
              isCorrect: opt.isCorrect,
              sortNo: opt.key.charCodeAt(0) - 65,
            })),
          }),
        ];
        if (kpIds.length > 0) {
          writes.push(prisma.questionKnowledgePoint.createMany({
            data: kpIds.map(kpId => ({ questionId: question.id, knowledgePointId: kpId })),
            skipDuplicates: true,
          }));
        }
        await Promise.all(writes);
        return question.id;
      }),
    );
    insertedIds.push(...created);
    success += created.length;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`  ${success}/${pending.length}  (${elapsed}s)`);
  }

  // 6. 统计校验
  console.log(`\n=== Step 6: 统计校验 ===`);
  const seededQuestions = await prisma.question.findMany({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, content: { in: [...desiredContents] } },
    select: { id: true },
  });
  const allIds = seededQuestions.map(q => q.id);
  const total = await prisma.question.count({ where: { id: { in: allIds } } });
  const optCount = await prisma.questionOption.count({ where: { questionId: { in: allIds } } });
  const kpLinkCount = await prisma.questionKnowledgePoint.count({ where: { questionId: { in: allIds } } });
  const kpDistinct = await prisma.questionKnowledgePoint.findMany({
    where: { questionId: { in: allIds } },
    select: { knowledgePointId: true },
  });
  const distinctKp = new Set(kpDistinct.map(k => String(k.knowledgePointId))).size;
  const typeGroups = await prisma.question.groupBy({
    by: ["type"],
    where: { id: { in: allIds } },
    _count: { _all: true },
  });
  const sortedIds = [...allIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const noKp = await prisma.question.count({
    where: { id: { in: allIds }, knowledgePoints: { none: {} } },
  });
  console.log(`  题目总数: ${total}${total === EXPECTED_TOTAL ? " ✓" : " ✗"}`);
  console.log(`  选项总数: ${optCount}`);
  console.log(`  知识点关联: ${kpLinkCount} 条，覆盖 ${distinctKp} 个知识点，未挂知识点题目 ${noKp} 道`);
  console.log(`  题型分布: ${typeGroups.map(g => `${g.type === 1 ? "单选" : g.type === 2 ? "多选" : "判断"}=${g._count._all}`).join(", ")}`);
  if (insertedIds.length > 0) {
    const min = insertedIds.reduce((a, b) => (a < b ? a : b));
    const max = insertedIds.reduce((a, b) => (a > b ? a : b));
    console.log(`  本次插入 id 范围: ${min} ~ ${max}（共 ${insertedIds.length} 条）`);
  } else {
    console.log(`  本次无新增（全部已存在）`);
  }
  console.log(`  全量 id 范围: ${sortedIds[0]} ~ ${sortedIds[sortedIds.length - 1]}`);
  console.log(`  回滚: npx tsx prisma/seed-grade1-english-questions.ts --rollback（按题干匹配删除）`);

  // 章节分布（按 L1 单元汇总，并列出 L2 明细）
  const dist = await prisma.question.groupBy({
    by: ["chapterId"],
    where: { id: { in: allIds } },
    _count: { _all: true },
  });
  const chapterRows = await prisma.chapter.findMany({
    where: { id: { in: dist.map(d => d.chapterId).filter((x): x is bigint => x !== null) } },
    select: { id: true, name: true, parentId: true, level: true },
  });
  const countByChapter = new Map<string, number>();
  for (const d of dist) countByChapter.set(String(d.chapterId), d._count._all);

  const unitTotals = new Map<string, number>();
  const unitDetails = new Map<string, string[]>();
  for (const t of chosen) {
    const unitIds = chapters.filter(c => c.textbookId === t.id && c.level === 1);
    for (const unit of unitIds) {
      const unitCount = countByChapter.get(String(unit.id)) ?? 0;
      let totalInUnit = unitCount;
      const details: string[] = [];
      if (unitCount > 0) details.push(`(单元本身) ${unitCount}`);
      for (const c of chapters.filter(x => x.parentId === unit.id)) {
        const n = countByChapter.get(String(c.id)) ?? 0;
        if (n > 0) {
          totalInUnit += n;
          details.push(`${c.name} ${n}`);
        }
      }
      if (totalInUnit > 0) {
        const label = `${t.semester === 1 ? "上册" : "下册"} · ${unit.name}`;
        unitTotals.set(label, totalInUnit);
        unitDetails.set(label, details);
      }
    }
  }
  console.log("\n章节分布（按单元）:");
  for (const [label, n] of unitTotals) {
    console.log(`  ${label}: ${n}`);
    console.log(`    ${unitDetails.get(label)!.join(" | ")}`);
  }

  const chapterCount = new Set([...countByChapter.entries()].filter(([, n]) => n > 0).map(([id]) => id)).size;
  console.log(`\n覆盖章节数: ${chapterCount}（有题章节）`);
  console.log(`总耗时: ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

import { PrismaClient } from "@prisma/client";
import type { RawQuestion } from "./data/types";
import { grade4ChineseSem2ExtraPart1 } from "./data/grade4-chinese-sem2-extra-part1";
import { grade4ChineseSem2ExtraPart2 } from "./data/grade4-chinese-sem2-extra-part2";
import { grade4ChineseSem2ExtraPart3 } from "./data/grade4-chinese-sem2-extra-part3";
import { grade4ChineseSem2ExtraPart4 } from "./data/grade4-chinese-sem2-extra-part4";

const prismaBase = new PrismaClient();

const GRADE_ID = BigInt(4); // 四年级
const SUBJECT_ID = BigInt(1); // 语文
const STAGE_ID = BigInt(1); // 小学
const SEMESTER = 2; // 下册
const SOURCE = "textbook";
const BATCH = 6;
const EXPECTED_TOTAL = 114;

const questions: RawQuestion[] = [
  ...grade4ChineseSem2ExtraPart1,
  ...grade4ChineseSem2ExtraPart2,
  ...grade4ChineseSem2ExtraPart3,
  ...grade4ChineseSem2ExtraPart4,
];

/** Supabase pooler 偶发断连（P1017）：重连后重试 */
async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 6): Promise<T> {
  let lastErr: any;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const transient =
        e?.code === "P1017" || e?.code === "P1001" || e?.code === "P2024" ||
        /closed the connection|ECONNRESET|timed out|Can't reach database/i.test(String(e?.message));
      if (!transient || i === attempts) throw e;
      console.warn(`  ⚠ ${label} 数据库连接异常（${e?.code ?? "unknown"}），第 ${i} 次重试...`);
      try { await prismaBase.$disconnect(); } catch { /* ignore */ }
      await new Promise(r => setTimeout(r, 1000 * i));
      try { await prismaBase.$connect(); } catch { /* ignore */ }
    }
  }
  throw lastErr;
}

const prisma = prismaBase.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        return withRetry(() => query(args), "db");
      },
    },
  },
});

/** 题干归一化：去空白、去标点与括号、统一大小写，用于发现“只换标点”的重复题 */
function normalize(content: string): string {
  return content
    .replace(/\s+/g, "")
    .replace(/[（）()「」“”"'‘’《》<>，,。.！!？?：:；;、·—\-_/\\]/g, "")
    .toLowerCase();
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
    } else if (q.type === 3) {
      if (q.options.length !== 2) errors.push(`[${no}] 判断应有 2 个选项，实际 ${q.options.length}`);
      if (correct.length !== 1) errors.push(`[${no}] 判断应且仅应有 1 个正确选项，实际 ${correct.length}`);
      const a = q.options.find(o => o.key === "A");
      const b = q.options.find(o => o.key === "B");
      if (!a || !b || a.content !== "正确" || b.content !== "错误") {
        errors.push(`[${no}] 判断题必须保持 A=正确、B=错误`);
      }
    } else {
      errors.push(`[${no}] 只允许单选(1)/判断(3)，实际 type=${q.type}`);
    }
    if (!q.content.trim()) errors.push(`[${no}] 题干为空`);
    if (!q.analysis?.trim()) errors.push(`[${no}] 缺少解析`);
    if (!q.chapterName) errors.push(`[${no}] 缺少章节`);
    if (q.semester !== SEMESTER) errors.push(`[${no}] semester 应为 2（下册），实际 ${q.semester}`);
    if (!q.kpNames || q.kpNames.length === 0) errors.push(`[${no}] 缺少知识点`);
    const key = normalize(q.content);
    if (seen.has(key)) errors.push(`[${no}] 题干与本批第 ${seen.get(key)} 题重复: ${q.content}`);
    else seen.set(key, no);
  });

  // 单选正确答案位置分布：四选项各应接近 25%，避免集中在某个位置
  const single = questions.filter(q => q.type === 1);
  const posCount = new Map<string, number>();
  for (const q of single) {
    const key = q.options.find(o => o.isCorrect)!.key;
    posCount.set(key, (posCount.get(key) ?? 0) + 1);
  }
  const total = single.length;
  for (const k of ["A", "B", "C", "D"]) {
    const n = posCount.get(k) ?? 0;
    const ratio = total === 0 ? 0 : n / total;
    if (ratio < 0.18 || ratio > 0.32) {
      errors.push(`单选正确项 ${k} 占比 ${(ratio * 100).toFixed(1)}%，应在 18%~32% 之间（${n}/${total}）`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`数据校验未通过（${errors.length} 处）：\n  - ${errors.slice(0, 30).join("\n  - ")}`);
  }
  return { single: single.length, judge: questions.length - single.length, posCount };
}

/** 删除题目及其所有依赖数据 */
async function deleteQuestions(ids: bigint[]) {
  if (ids.length === 0) return;
  await prisma.userQuestionProgress.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.studyAttemptItem.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.userQuestionFavorite.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.questionTagLink.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.questionOption.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.questionKnowledgePoint.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.question.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rollback = process.argv.includes("--rollback");

  // 0. 本地数据校验
  console.log(`=== 四年级语文下册补充题库（目标 ${EXPECTED_TOTAL} 道）===\n`);
  const stat = validateData();
  console.log(
    `数据校验通过：${questions.length} 道（单选 ${stat.single} / 判断 ${stat.judge}），题干无重复，每题恰好一个正确答案。`,
  );
  console.log(
    `单选正确项位置: ${["A", "B", "C", "D"].map(k => `${k}=${stat.posCount.get(k) ?? 0}`).join(", ")}`,
  );
  if (dryRun) {
    console.log("\n--dry-run：仅做本地校验，未访问数据库。");
    return;
  }

  // 1. 定位四年级语文下册（人教版）教材
  const textbook = await prisma.textbook.findFirst({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, semester: SEMESTER, publisher: { name: { contains: "人教版" } } },
    select: { id: true, name: true, semester: true, publisher: { select: { name: true } } },
  });
  if (!textbook) throw new Error("未找到人教版四年级语文下册教材。");
  console.log(`\n教材: id=${textbook.id} ${textbook.publisher.name} ${textbook.name} 学期=${textbook.semester}`);

  // 2. 章节：按名称建映射（本册内单元与课文同名冲突概率极低，同名取更具体的一条）
  const chapters = await prisma.chapter.findMany({
    where: { textbookId: textbook.id },
    select: { id: true, name: true, parentId: true },
    orderBy: { id: "asc" },
  });
  const chapterByName = new Map<string, bigint>();
  for (const c of chapters) {
    if (!chapterByName.has(c.name)) chapterByName.set(c.name, c.id);
  }
  console.log(`章节总数: ${chapters.length}，名称去重: ${chapterByName.size}`);

  const missingChapters = [...new Set(questions.map(q => q.chapterName!))].filter(n => !chapterByName.has(n));
  if (missingChapters.length > 0) {
    throw new Error(`章节名称未匹配（${missingChapters.length} 个）：\n  - ${missingChapters.join("\n  - ")}`);
  }

  // 3. 知识点
  const allKP = await prisma.knowledgePoint.findMany({
    where: { subjectId: SUBJECT_ID, stageId: STAGE_ID },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
  const kpMap = new Map<string, bigint>();
  for (const k of allKP) if (!kpMap.has(k.name)) kpMap.set(k.name, k.id);
  const missingKps = [...new Set(questions.flatMap(q => q.kpNames ?? []))].filter(n => !kpMap.has(n));
  if (missingKps.length > 0) {
    throw new Error(`知识点名称未匹配（${missingKps.length} 个）：\n  - ${missingKps.join("\n  - ")}`);
  }
  console.log(`知识点匹配通过：使用 ${new Set(questions.flatMap(q => q.kpNames ?? [])).size} 个`);

  // 4. 与数据库中已有四年级语文题判重（上、下册都比对，归一化后判等）
  const existing = await prisma.question.findMany({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID },
    select: { id: true, content: true },
  });
  const existingByNormalized = new Map<string, string>();
  for (const e of existing) existingByNormalized.set(normalize(e.content), `${e.id} ${e.content}`);
  const duplicated = questions
    .map(q => ({ q, hit: existingByNormalized.get(normalize(q.content)) }))
    .filter(x => x.hit);
  if (duplicated.length > 0) {
    throw new Error(
      `新题与数据库已有题目重复（${duplicated.length} 道），已停止写入：\n  - ${duplicated
        .slice(0, 30)
        .map(x => `新题「${x.q.content}」 ↔ 已有 ${x.hit}`)
        .join("\n  - ")}`,
    );
  }
  console.log(`与数据库已有 ${existing.length} 道四年级语文题比对：无重复 ✓`);

  // 5. 回滚
  if (rollback) {
    const contents = questions.map(q => q.content);
    const rows = await prisma.question.findMany({
      where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, content: { in: contents } },
      select: { id: true },
    });
    const ids = rows.map(r => r.id);
    await deleteQuestions(ids);
    console.log(`已回滚：按题干匹配删除 ${ids.length} 道题目。`);
    return;
  }

  // 6. 写入（不关联标签）
  const maxSort = await prisma.question.aggregate({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID },
    _max: { sortOrder: true },
  });
  const baseSort = maxSort._max.sortOrder ?? 0;
  console.log(`\n=== 写入 ${questions.length} 道（起始 sortOrder=${baseSort + 1}，不关联标签）===`);

  const insertedIds: bigint[] = [];
  const start = Date.now();
  for (let i = 0; i < questions.length; i += BATCH) {
    const batch = questions.slice(i, i + BATCH);
    const created = await Promise.all(
      batch.map((q, j) => {
        const globalIdx = i + j;
        const chapterId = chapterByName.get(q.chapterName!)!;
        const kpIds = [...new Set((q.kpNames ?? []).map(name => kpMap.get(name)!))];
        return withRetry(async () => {
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
              sortOrder: baseSort + globalIdx + 1,
            },
          });
          await prisma.questionOption.createMany({
            data: q.options.map(opt => ({
              questionId: question.id,
              optionKey: opt.key,
              content: opt.content,
              isCorrect: opt.isCorrect,
              sortNo: opt.key.charCodeAt(0) - 65,
            })),
          });
          await prisma.questionKnowledgePoint.createMany({
            data: kpIds.map(kpId => ({ questionId: question.id, knowledgePointId: kpId })),
            skipDuplicates: true,
          });
          return question.id;
        }, `第 ${globalIdx + 1} 题`);
      }),
    );
    insertedIds.push(...created);
    console.log(`  ${insertedIds.length}/${questions.length}  (${((Date.now() - start) / 1000).toFixed(1)}s)`);
  }

  // 7. 统计校验：下册 200 题
  const chapterIds = chapters.map(c => c.id);
  const total = await prisma.question.count({ where: { chapterId: { in: chapterIds } } });
  const optionCount = await prisma.questionOption.count({ where: { questionId: { in: insertedIds } } });
  const kpLinkCount = await prisma.questionKnowledgePoint.count({ where: { questionId: { in: insertedIds } } });
  const tagLinkCount = await prisma.questionTagLink.count({ where: { questionId: { in: insertedIds } } });
  console.log(`\n=== 统计校验 ===`);
  console.log(`  本次插入: ${insertedIds.length} 道（选项 ${optionCount} 条，知识点关联 ${kpLinkCount} 条，标签关联 ${tagLinkCount} 条）`);
  console.log(`  四年级语文下册题目总数: ${total}${total === 200 ? " ✓" : " ✗（预期 200）"}`);

  const dist = await prisma.question.groupBy({
    by: ["chapterId"],
    where: { chapterId: { in: chapterIds } },
    _count: { _all: true },
  });
  const countByChapter = new Map(dist.map(d => [String(d.chapterId), d._count._all]));
  console.log("\n各单元题数:");
  for (const unit of chapters.filter(c => c.parentId === null)) {
    let sum = countByChapter.get(String(unit.id)) ?? 0;
    for (const c of chapters.filter(x => String(x.parentId) === String(unit.id))) {
      sum += countByChapter.get(String(c.id)) ?? 0;
    }
    console.log(`  ${unit.name}: ${sum}`);
  }
  console.log(`\n总耗时: ${((Date.now() - start) / 1000).toFixed(1)}s`);
  console.log(`回滚: npx tsx prisma/seed-grade4-chinese-sem2-extra.ts --rollback`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

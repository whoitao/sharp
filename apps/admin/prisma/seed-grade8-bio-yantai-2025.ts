// 2025 年山东省烟台市中考生物真题（解析版）—— 单选题导入
// 用法：
//   写入（幂等）：cd apps/admin && npx tsx prisma/seed-grade8-bio-yantai-2025.ts
//   回滚：        cd apps/admin && npx tsx prisma/seed-grade8-bio-yantai-2025.ts --rollback
// 说明：
//   - 只导单选题，判断题/填空题/简答等其它题型跳过；
//   - 题干/选项/解析按仓库 rich-text 白名单清洗后入库，图片为 Supabase Storage URL；
//   - 标签只关联已有的「中考真题」，不创建标签；
//   - 幂等按「年级 + 科目 + 题干」判重，重复执行不会重复插入。
import { PrismaClient } from "@prisma/client";
import { sanitizeRichHtml } from "../lib/rich-text";
import { yantai2025BioQuestions, type SeedQuestion } from "./data/grade8-bio-yantai-2025";

const prismaBase = new PrismaClient();

const GRADE_ID = BigInt(8); // 初二
const GRADE_NAME = "初二";
const SUBJECT_ID = BigInt(6); // 生物
const SUBJECT_NAME = "生物";
const TAG_NAME = "中考真题";
const SOURCE = "exam";

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
      console.warn(`  ⚠ ${label} 连接异常（${e?.code ?? "unknown"}），第 ${i} 次重试...`);
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

/** 仓库统一富文本清洗（正文图片已是 Supabase Storage URL） */
function clean(html: string): string {
  return sanitizeRichHtml(html);
}

type Prepared = Omit<SeedQuestion, "content" | "analysis" | "options"> & {
  content: string;
  analysis: string;
  options: { key: string; content: string; isCorrect: boolean }[];
};

const questions: Prepared[] = yantai2025BioQuestions.map(q => ({
  ...q,
  content: clean(q.content),
  analysis: clean(q.analysis),
  options: q.options.map(o => ({ ...o, content: clean(o.content) })),
}));

function validateData() {
  const errors: string[] = [];
  const seen = new Set<string>();
  questions.forEach(q => {
    const no = q.no;
    if (q.type !== 1) errors.push(`[${no}] 只允许单选题`);
    if (!q.content.trim()) errors.push(`[${no}] 题干为空`);
    if (!q.analysis.trim()) errors.push(`[${no}] 解析为空`);
    if (q.options.length !== 4) errors.push(`[${no}] 选项数应为 4，实际 ${q.options.length}`);
    if (q.options.map(o => o.key).join("") !== "ABCD") errors.push(`[${no}] 选项 key 应为 ABCD`);
    const correct = q.options.filter(o => o.isCorrect);
    if (correct.length !== 1) errors.push(`[${no}] 正确选项应恰好 1 个，实际 ${correct.length}`);
    if (correct.length === 1 && correct[0].key !== q.answer) {
      errors.push(`[${no}] 答案标记 ${q.answer} 与 isCorrect ${correct[0].key} 不一致`);
    }
    if (seen.has(q.content)) errors.push(`[${no}] 题干与其它题重复`);
    seen.add(q.content);
  });
  if (errors.length) {
    throw new Error(`数据校验未通过（${errors.length} 处）：\n  - ${errors.join("\n  - ")}`);
  }
}

/** 删除题目及其依赖数据（选项、知识点、作答记录、收藏；标签关联由数据库级联删除） */
async function deleteQuestions(ids: bigint[]) {
  if (ids.length === 0) return;
  await prisma.userQuestionProgress.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.studyAttemptItem.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.userQuestionFavorite.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.questionKnowledgePoint.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.questionOption.deleteMany({ where: { questionId: { in: ids } } });
  await prisma.question.deleteMany({ where: { id: { in: ids } } });
}

async function main() {
  const rollback = process.argv.includes("--rollback");
  const contents = questions.map(q => q.content);

  if (rollback) {
    const existing = await prisma.question.findMany({
      where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, content: { in: contents } },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    const ids = existing.map(q => q.id);
    await deleteQuestions(ids);
    console.log(`已回滚：按题干删除 ${ids.length} 道题目${ids.length ? `（id ${ids[0]}~${ids[ids.length - 1]}）` : ""}。`);
    return;
  }

  console.log("=== 2025 烟台中考生物单选题导入 ===\n");
  validateData();
  console.log(`数据校验通过：${questions.length} 道单选题，题干无重复，每题恰好一个正确答案。`);

  // ── Step 1: 写入前预检年级/科目/教材/章节/知识点/标签 ──
  console.log("\n=== Step 1: 写入前预检 ===");
  const grade = await prisma.grade.findUnique({ where: { id: GRADE_ID }, include: { stage: true } });
  if (!grade || grade.name !== GRADE_NAME) {
    throw new Error(`年级不存在或名称不符：期望 id=${GRADE_ID} name=${GRADE_NAME}，实际 ${grade ? `id=${grade.id} name=${grade.name}` : "未找到"}。已中止。`);
  }
  const subject = await prisma.subject.findUnique({ where: { id: SUBJECT_ID } });
  if (!subject || subject.name !== SUBJECT_NAME) {
    throw new Error(`科目不存在或名称不符：期望 id=${SUBJECT_ID} name=${SUBJECT_NAME}，实际 ${subject ? `id=${subject.id} name=${subject.name}` : "未找到"}。已中止。`);
  }
  console.log(`  年级: ${grade.name}（id=${grade.id}，学段=${grade.stage.name} stageId=${grade.stageId}）`);
  console.log(`  科目: ${subject.name}（id=${subject.id}）`);

  const tag = await prisma.questionTag.findUnique({ where: { name: TAG_NAME } });
  if (!tag) {
    throw new Error(`标签「${TAG_NAME}」不存在，按约定不新建标签。已中止。`);
  }
  console.log(`  标签: ${tag.name}（id=${tag.id}，type=${tag.type}）`);

  const textbooks = await prisma.textbook.findMany({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID },
    select: { id: true, name: true, semester: true, publisher: { select: { name: true } } },
    orderBy: { semester: "asc" },
  });
  if (textbooks.length === 0) {
    throw new Error("未找到初二生物教材。已中止。");
  }
  for (const t of textbooks) console.log(`  教材: id=${t.id} ${t.name} [${t.publisher.name}] 学期=${t.semester}`);

  const chapters = await prisma.chapter.findMany({
    where: { textbookId: { in: textbooks.map(t => t.id) } },
    select: { id: true, name: true, textbookId: true, parentId: true },
  });
  if (chapters.length === 0) throw new Error("初二生物教材没有章节数据。已中止。");

  const tbSemester = new Map(textbooks.map(t => [String(t.id), t.semester]));
  const chapterMap = new Map<string, bigint>(); // `${semester}|${name}`
  for (const c of chapters) {
    const sem = tbSemester.get(String(c.textbookId));
    chapterMap.set(`${sem}|${c.name}`, c.id);
  }
  console.log(`  章节: ${chapterMap.size} 个（初二上册 + 下册）`);

  const allKP = await prisma.knowledgePoint.findMany({
    where: { subjectId: SUBJECT_ID, stageId: grade.stageId },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
  if (allKP.length === 0) throw new Error("未找到初二生物知识点。已中止。");
  const kpMap = new Map<string, bigint>();
  for (const k of allKP) if (!kpMap.has(k.name)) kpMap.set(k.name, k.id);
  console.log(`  知识点: ${allKP.length} 个（去重名称 ${kpMap.size} 个）`);

  // 章节/知识点匹配预检：引用即必须存在，缺失直接中止
  const missing: string[] = [];
  for (const q of questions) {
    if (q.chapter) {
      const key = `${q.chapter.semester}|${q.chapter.name}`;
      if (!chapterMap.has(key)) {
        missing.push(`[${q.no}] 章节未找到：${q.chapter.semester === 1 ? "上册" : "下册"} · ${q.chapter.name}`);
      }
    }
    for (const name of q.kpNames) {
      if (!kpMap.has(name)) missing.push(`[${q.no}] 知识点未找到：${name}`);
    }
  }
  if (missing.length) {
    throw new Error(`预检失败（${missing.length} 处），已停止写入：\n  - ${[...new Set(missing)].join("\n  - ")}`);
  }
  console.log("  章节与知识点引用全部存在。");

  // ── Step 2: 幂等盘点 ──
  console.log("\n=== Step 2: 幂等检查（按年级 + 科目 + 题干判重）===");
  const existingQs = await prisma.question.findMany({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, content: { in: contents } },
    select: {
      id: true,
      content: true,
      chapterId: true,
      options: { select: { optionKey: true, content: true, isCorrect: true } },
      knowledgePoints: { select: { knowledgePointId: true } },
      tags: { select: { tagId: true } },
    },
  });
  const byContent = new Map(existingQs.map(q => [q.content, q]));
  console.log(`  已存在同题干题目 ${existingQs.length} 道（重复执行将复用，不重复插入）`);

  const maxSort = await prisma.question.aggregate({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID },
    _max: { sortOrder: true },
  });
  let nextSort = (maxSort._max.sortOrder ?? 0) + 1;

  // ── Step 3: 写入 / 补齐 ──
  console.log("\n=== Step 3: 写入 ===");
  let created = 0;
  let reused = 0;
  let repairedOptions = 0;
  let chapterMismatch = 0;
  const allIds: bigint[] = [];

  for (const q of questions) {
    const chapterId = q.chapter ? chapterMap.get(`${q.chapter.semester}|${q.chapter.name}`)! : null;
    const kpIds = [...new Set(q.kpNames.map(n => kpMap.get(n)!))];

    const existing = byContent.get(q.content);
    if (existing) {
      // 复用：校验选项，不一致则重建；补齐章节/知识点/标签
      const sameOptions =
        existing.options.length === q.options.length &&
        q.options.every(o =>
          existing.options.some(e => e.optionKey === o.key && e.content === o.content && e.isCorrect === o.isCorrect),
        );
      const currentChapter = existing.chapterId === null ? null : String(existing.chapterId);
      const wantChapter = chapterId === null ? null : String(chapterId);
      if (!sameOptions) {
        await withRetry(async () => {
          await prisma.questionOption.deleteMany({ where: { questionId: existing.id } });
          await prisma.questionOption.createMany({
            data: q.options.map(o => ({
              questionId: existing.id,
              optionKey: o.key,
              content: o.content,
              isCorrect: o.isCorrect,
              sortNo: o.key.charCodeAt(0) - 65,
            })),
          });
        }, `第 ${q.no} 题选项修复`);
        repairedOptions++;
      }
      if (currentChapter !== wantChapter) {
        await withRetry(
          () => prisma.question.update({ where: { id: existing.id }, data: { chapterId } }),
          `第 ${q.no} 题章节修复`,
        );
        chapterMismatch++;
      }
      const haveKp = new Set(existing.knowledgePoints.map(k => String(k.knowledgePointId)));
      const addKp = kpIds.filter(id => !haveKp.has(String(id)));
      if (addKp.length) {
        await withRetry(
          () =>
            prisma.questionKnowledgePoint.createMany({
              data: addKp.map(id => ({ questionId: existing.id, knowledgePointId: id })),
              skipDuplicates: true,
            }),
          `第 ${q.no} 题知识点补齐`,
        );
      }
      if (!existing.tags.some(t => String(t.tagId) === String(tag.id))) {
        await withRetry(
          () =>
            prisma.questionTagLink.create({
              data: { questionId: existing.id, tagId: tag.id },
            }),
          `第 ${q.no} 题标签补齐`,
        );
      }
      // 解析同步（题干相同视为同一题）
      await withRetry(
        () => prisma.question.update({ where: { id: existing.id }, data: { analysis: q.analysis } }),
        `第 ${q.no} 题解析同步`,
      );
      allIds.push(existing.id);
      reused++;
      console.log(`  ↺ 第 ${q.no} 题已存在，复用 id=${existing.id}`);
      continue;
    }

    const id = await withRetry(async () => {
      // 自愈：上一次中途失败可能留下同题干半成品
      const dup = await prisma.question.findFirst({
        where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, content: q.content },
        select: { id: true },
      });
      if (dup) await deleteQuestions([dup.id]);

      const question = await prisma.question.create({
        data: {
          type: q.type,
          content: q.content,
          analysis: q.analysis,
          difficulty: 1,
          score: 1,
          gradeId: GRADE_ID,
          subjectId: SUBJECT_ID,
          chapterId,
          source: SOURCE,
          sortOrder: nextSort++,
        },
      });
      await prisma.questionOption.createMany({
        data: q.options.map(o => ({
          questionId: question.id,
          optionKey: o.key,
          content: o.content,
          isCorrect: o.isCorrect,
          sortNo: o.key.charCodeAt(0) - 65,
        })),
      });
      if (kpIds.length) {
        await prisma.questionKnowledgePoint.createMany({
          data: kpIds.map(kpId => ({ questionId: question.id, knowledgePointId: kpId })),
          skipDuplicates: true,
        });
      }
      await prisma.questionTagLink.create({ data: { questionId: question.id, tagId: tag.id } });
      return question.id;
    }, `第 ${q.no} 题`);
    allIds.push(id);
    created++;
    console.log(`  + 第 ${q.no} 题已写入 id=${id}`);
  }

  // ── Step 4: 统计 ──
  const finalQs = await prisma.question.findMany({
    where: { id: { in: allIds } },
    select: {
      id: true,
      chapterId: true,
      chapter: { select: { name: true, textbookId: true } },
      options: { select: { optionKey: true, isCorrect: true } },
      knowledgePoints: { select: { knowledgePoint: { select: { name: true } } } },
      tags: { select: { tagId: true } },
    },
    orderBy: { id: "asc" },
  });

  const mapped = finalQs.filter(q => q.chapterId !== null);
  const unmatchedNos = questions.filter(q => q.chapter === null).map(q => q.no);
  const kpLinkCount = finalQs.reduce((n, q) => n + q.knowledgePoints.length, 0);
  const kpNames = new Set(finalQs.flatMap(q => q.knowledgePoints.map(k => k.knowledgePoint.name)));
  const tagOk = finalQs.every(q => q.tags.some(t => String(t.tagId) === String(tag.id)));
  const optionOk = finalQs.every(q => q.options.length === 4 && q.options.filter(o => o.isCorrect).length === 1);

  console.log("\n=== 结果统计 ===");
  console.log(`  docx 识别单选题: ${questions.length} 道`);
  console.log(`  本次新建: ${created} 道，复用已有: ${reused} 道`);
  console.log(`  id 范围: ${allIds.length ? `${allIds[0]} ~ ${allIds[allIds.length - 1]}` : "无"}`);
  console.log(`  章节关联: ${mapped.length}/${finalQs.length} 道；未匹配 ${unmatchedNos.length} 道（题号 ${unmatchedNos.join(", ")}）`);
  for (const q of mapped) {
    console.log(`    - id=${q.id} → ${q.chapter?.name}`);
  }
  console.log(`  知识点关联: ${kpLinkCount} 条，覆盖 ${kpNames.size} 个知识点`);
  console.log(`  标签关联: ${tagOk ? "全部关联「中考真题」" : "存在缺失"}`);
  console.log(`  选项校验: ${optionOk ? "全部为 4 选项且恰好 1 个正确" : "存在异常"}`);
  if (repairedOptions || chapterMismatch) {
    console.log(`  幂等修复: 选项重建 ${repairedOptions} 道，章节修正 ${chapterMismatch} 道`);
  }
}

main()
  .catch(e => {
    console.error("\n❌ 导入失败：", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prismaBase.$disconnect();
  });

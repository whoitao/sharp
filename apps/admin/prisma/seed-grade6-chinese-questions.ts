import { PrismaClient } from "@prisma/client";
import type { RawQuestion } from "./data/types";
import { grade6ChinesePart1 } from "./data/grade6-chinese-part1";
import { grade6ChinesePart2 } from "./data/grade6-chinese-part2";
import { grade6ChinesePart3 } from "./data/grade6-chinese-part3";
import { grade6ChinesePart4 } from "./data/grade6-chinese-part4";

const prismaBase = new PrismaClient();

const GRADE_ID = BigInt(6); // 六年级
const SUBJECT_ID = BigInt(1); // 语文
const STAGE_ID = BigInt(1); // 小学
const SOURCE = "textbook";
const BATCH = 4;
const EXPECTED_TOTAL = 400;

// ───────────── 单选选项随机化（确定性，保证复跑顺序一致） ─────────────
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OPTION_KEYS = ["A", "B", "C", "D", "E"];

/**
 * 单选题：按题干哈希做确定性洗牌，重新分配 A/B/C/D，正确答案位置不再固定；
 * 判断题：保持原样（A=正确、B=错误）。
 */
function shuffleQuestionOptions(q: RawQuestion): RawQuestion {
  if (q.type !== 1) return q;
  const rand = mulberry32(hashSeed(q.content));
  const arr = q.options.map(o => ({ ...o }));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return {
    ...q,
    options: arr.map((o, i) => ({ key: OPTION_KEYS[i], content: o.content, isCorrect: o.isCorrect })),
  };
}

const rawQuestions: RawQuestion[] = [
  ...grade6ChinesePart1,
  ...grade6ChinesePart2,
  ...grade6ChinesePart3,
  ...grade6ChinesePart4,
];
const questions: RawQuestion[] = rawQuestions.map(shuffleQuestionOptions);

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

// 所有模型查询自动带断线重试
const prisma = prismaBase.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        return withRetry(() => query(args), "db");
      },
    },
  },
});

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
      const keys = q.options.map(o => o.key).join("");
      if (keys !== "ABCD") errors.push(`[${no}] 单选选项 key 应为 ABCD，实际 ${keys}`);
    } else if (q.type === 2) {
      errors.push(`[${no}] 本批次只允许单选/判断，确保每题恰好一个正确答案`);
    } else if (q.type === 3) {
      if (q.options.length !== 2) errors.push(`[${no}] 判断应有 2 个选项，实际 ${q.options.length}`);
      if (correct.length !== 1) errors.push(`[${no}] 判断应且仅应有 1 个正确选项，实际 ${correct.length}`);
      const a = q.options.find(o => o.key === "A");
      const b = q.options.find(o => o.key === "B");
      if (!a || !b || a.content !== "正确" || b.content !== "错误") {
        errors.push(`[${no}] 判断题必须保持 A=正确、B=错误`);
      }
    } else {
      errors.push(`[${no}] 未知题型: ${q.type}`);
    }
    if (!q.content.trim()) errors.push(`[${no}] 题干为空`);
    if (!q.analysis?.trim()) errors.push(`[${no}] 缺少解析`);
    if (!q.chapterName) errors.push(`[${no}] 缺少章节`);
    if (q.semester !== 1 && q.semester !== 2) errors.push(`[${no}] 缺少或非法 semester`);
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

  console.log(`=== 六年级语文题库写入（目标 ${EXPECTED_TOTAL} 道）===\n`);
  validateData();
  console.log(`数据校验通过：${questions.length} 道，题干无重复，每题恰好一个正确答案，选项/解析/章节/知识点完整。`);

  // 1. 核对教材与章节
  console.log("\n=== Step 1: 核对教材与章节 ===");
  const textbooks = await prisma.textbook.findMany({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID },
    select: { id: true, name: true, semester: true, publisher: { select: { name: true } } },
    orderBy: { semester: "asc" },
  });
  if (textbooks.length === 0) throw new Error("未找到六年级语文教材，请先执行教材章节 seed。");
  for (const t of textbooks) console.log(`  教材: id=${t.id} ${t.name} [${t.publisher.name}] 学期=${t.semester}`);

  // 章节最完整的一套：按 (L1 单元数, L2 子章节数) 择优，同出版社双册一起使用
  const byPublisher = new Map<string, typeof textbooks>();
  for (const t of textbooks) {
    const p = t.publisher.name;
    if (!byPublisher.has(p)) byPublisher.set(p, [] as any);
    byPublisher.get(p)!.push(t);
  }
  const publisherRank: { name: string; books: typeof textbooks; l1: number; l2: number; score: number }[] = [];
  for (const [name, books] of byPublisher) {
    const ids = books.map(b => b.id);
    const cs = await prisma.chapter.findMany({
      where: { textbookId: { in: ids } },
      select: { id: true, parentId: true },
    });
    const l1 = cs.filter(c => c.parentId === null).length;
    const l2 = cs.length - l1;
    publisherRank.push({ name, books, l1, l2, score: l1 * 1000 + l2 });
  }
  publisherRank.sort((a, b) => b.score - a.score);
  for (const r of publisherRank) console.log(`  候选版本: ${r.name}（${r.books.length} 册, L1=${r.l1}, L2=${r.l2}）`);
  const chosenPublisher = publisherRank[0];
  if (!chosenPublisher || chosenPublisher.books.length === 0) throw new Error("没有可用教材版本。");
  const chosen = chosenPublisher.books;
  console.log(`  选用: ${chosenPublisher.name}（${chosen.length} 册，章节最完整）`);

  const tbIds = chosen.map(t => t.id);
  const chapters = await prisma.chapter.findMany({
    where: { textbookId: { in: tbIds } },
    select: { id: true, name: true, level: true, textbookId: true, parentId: true },
  });
  if (chapters.length === 0) throw new Error("所选教材没有章节数据。");

  const tbSemester = new Map(chosen.map(t => [String(t.id), t.semester]));
  const l2Map = new Map<string, bigint>(); // `${semester}|${name}` 课时级
  const l1Map = new Map<string, bigint>(); // `${semester}|${name}` 单元级
  for (const c of chapters) {
    const sem = tbSemester.get(String(c.textbookId));
    const key = `${sem}|${c.name}`;
    // 章节层级以 parentId 为准（部分教材数据的 level 字段未写入），level 作为兜底
    if (c.parentId === null) l1Map.set(key, c.id);
    else l2Map.set(key, c.id);
  }
  console.log(`  章节: L1=${l1Map.size}, L2=${l2Map.size}`);

  // 2. 核对知识点
  console.log("\n=== Step 2: 核对知识点 ===");
  const allKP = await prisma.knowledgePoint.findMany({
    where: { subjectId: SUBJECT_ID, stageId: STAGE_ID },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
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
  const questionsByContent = new Map(questions.map(q => [q.content, q]));

  // 盘点同年级同学科、题干命中本数据集的已有题目：完整则复用（补知识点），不匹配则删除重建
  const existingQs = await prisma.question.findMany({
    where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, content: { in: [...desiredContents] } },
    select: {
      id: true,
      content: true,
      chapterId: true,
      options: { select: { optionKey: true, content: true, isCorrect: true } },
      knowledgePoints: { select: { knowledgePointId: true } },
    },
  });
  const reusableContents = new Set<string>();
  const kpLinks: { questionId: bigint; knowledgePointId: bigint }[] = [];
  let repaired = 0;
  let deleted = 0;

  for (const e of existingQs) {
    const q = questionsByContent.get(e.content)!;
    const key = `${q.semester}|${q.chapterName}`;
    const chapterId = l2Map.get(key) ?? l1Map.get(key) ?? null;
    const kpIds = [...new Set((q.kpNames ?? []).map(name => kpMap.get(name)!))];
    const optionsMatch =
      e.options.length === q.options.length &&
      q.options.every(o => e.options.some(x => x.optionKey === o.key && x.content === o.content && x.isCorrect === o.isCorrect));
    if (!optionsMatch) {
      await deleteQuestions([e.id]);
      deleted++;
      continue;
    }
    const globalIdx = questions.findIndex(x => x.content === q.content);
    const chapterChanged =
      (chapterId === null) !== (e.chapterId === null) ||
      (chapterId !== null && String(chapterId) !== String(e.chapterId));
    if (chapterChanged) {
      await prisma.question.update({ where: { id: e.id }, data: { chapterId, sortOrder: globalIdx + 1 } });
      repaired++;
    }
    const haveKp = new Set(e.knowledgePoints.map(k => String(k.knowledgePointId)));
    for (const kpId of kpIds) {
      if (!haveKp.has(String(kpId))) kpLinks.push({ questionId: e.id, knowledgePointId: kpId });
    }
    reusableContents.add(q.content);
  }
  if (kpLinks.length > 0) {
    await prisma.questionKnowledgePoint.createMany({ data: kpLinks, skipDuplicates: true });
  }
  console.log(`  已有题目命中数据集 ${existingQs.length} 道：复用 ${reusableContents.size} 道（修复章节 ${repaired} 道），删除不匹配 ${deleted} 道`);

  const pending = questions.filter(q => !reusableContents.has(q.content));
  console.log(`  本次待插入 ${pending.length} 道，已存在跳过 ${questions.length - pending.length} 道`);

  // 5. 分批并发写入
  console.log(`\n=== Step 5: 写入 ${pending.length} 道 ===`);
  let success = 0;
  const insertedIds: bigint[] = [];
  const start = Date.now();

  for (let batchStart = 0; batchStart < pending.length; batchStart += BATCH) {
    const batch = pending.slice(batchStart, batchStart + BATCH);
    const created = await Promise.all(
      batch.map((q) => {
        const key = `${q.semester}|${q.chapterName}`;
        const chapterId = l2Map.get(key) ?? l1Map.get(key) ?? null;
        const kpIds = [...new Set((q.kpNames ?? []).map(name => kpMap.get(name)!))];
        const globalIdx = questions.findIndex(x => x.content === q.content);

        // 逐条写入 + 自愈重试：中途断连时，下一次尝试先清掉本次未写完的半成品再重建
        return withRetry(async () => {
          const dup = await prisma.question.findFirst({
            where: { gradeId: GRADE_ID, subjectId: SUBJECT_ID, content: q.content },
            select: { id: true },
          });
          if (dup) await deleteQuestions([dup.id]);

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
          await prisma.questionOption.createMany({
            data: q.options.map(opt => ({
              questionId: question.id,
              optionKey: opt.key,
              content: opt.content,
              isCorrect: opt.isCorrect,
              sortNo: opt.key.charCodeAt(0) - 65,
            })),
          });
          if (kpIds.length > 0) {
            await prisma.questionKnowledgePoint.createMany({
              data: kpIds.map(kpId => ({ questionId: question.id, knowledgePointId: kpId })),
              skipDuplicates: true,
            });
          }
          return question.id;
        }, `第 ${globalIdx + 1} 题`);
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
  const kpDistinctRows = await prisma.questionKnowledgePoint.findMany({
    where: { questionId: { in: allIds } },
    select: { knowledgePointId: true },
  });
  const distinctKp = new Set(kpDistinctRows.map(k => String(k.knowledgePointId))).size;
  const typeGroups = await prisma.question.groupBy({
    by: ["type"],
    where: { id: { in: allIds } },
    _count: { _all: true },
  });
  const sortedIds = [...allIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const noKp = await prisma.question.count({
    where: { id: { in: allIds }, knowledgePoints: { none: {} } },
  });
  const typeName = (t: number) => (t === 1 ? "单选" : t === 2 ? "多选" : t === 3 ? "判断" : `type${t}`);
  console.log(`  题目总数: ${total}${total === EXPECTED_TOTAL ? " ✓" : " ✗"}`);
  console.log(`  选项总数: ${optCount}`);
  console.log(`  知识点关联: ${kpLinkCount} 条，覆盖 ${distinctKp} 个知识点，未挂知识点题目 ${noKp} 道`);
  console.log(`  题型分布: ${typeGroups.map(g => `${typeName(g.type)}=${g._count._all}`).join(", ")}`);

  // 单选题正确答案位置分布（验证随机化生效）
  const correctOptions = await prisma.questionOption.findMany({
    where: { questionId: { in: allIds }, isCorrect: true, question: { type: 1 } },
    select: { optionKey: true },
  });
  const posCount = new Map<string, number>();
  for (const o of correctOptions) posCount.set(o.optionKey, (posCount.get(o.optionKey) ?? 0) + 1);
  console.log(`  单选正确答案位置: ${["A", "B", "C", "D"].map(k => `${k}=${posCount.get(k) ?? 0}`).join(", ")}（共 ${correctOptions.length}）`);

  if (insertedIds.length > 0) {
    const min = insertedIds.reduce((a, b) => (a < b ? a : b));
    const max = insertedIds.reduce((a, b) => (a > b ? a : b));
    console.log(`  本次插入 id 范围: ${min} ~ ${max}（共 ${insertedIds.length} 条）`);
  } else {
    console.log(`  本次无新增（全部已存在），幂等复跑通过 ✓`);
  }
  console.log(`  全量 id 范围: ${sortedIds[0]} ~ ${sortedIds[sortedIds.length - 1]}`);
  console.log(`  回滚: npx tsx prisma/seed-grade6-chinese-questions.ts --rollback（按题干匹配删除）`);

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
  const chapterById = new Map(chapterRows.map(c => [String(c.id), c]));
  const countByChapter = new Map<string, number>();
  for (const d of dist) countByChapter.set(String(d.chapterId), d._count._all);

  const unitTotals = new Map<string, number>();
  const unitDetails = new Map<string, string[]>();
  for (const t of chosen) {
    const unitIds = chapters.filter(c => String(c.textbookId) === String(t.id) && c.parentId === null);
    for (const unit of unitIds) {
      const unitCount = countByChapter.get(String(unit.id)) ?? 0;
      let totalInUnit = unitCount;
      const details: string[] = [];
      if (unitCount > 0) details.push(`(单元) ${unitCount}`);
      for (const c of chapters.filter(x => String(x.parentId) === String(unit.id))) {
        const n = countByChapter.get(String(c.id)) ?? 0;
        if (n > 0) {
          totalInUnit += n;
          details.push(`${c.name} ${n}`);
        }
      }
      const label = `${t.semester === 1 ? "上册" : "下册"} · ${unit.name}`;
      unitTotals.set(label, totalInUnit);
      unitDetails.set(label, details);
    }
  }
  console.log("\n章节分布（按单元）:");
  for (const [label, n] of unitTotals) {
    console.log(`  ${label}: ${n}`);
    if (n > 0) console.log(`    ${unitDetails.get(label)!.join(" | ")}`);
  }

  const chapterCount = new Set([...countByChapter.entries()].filter(([, n]) => n > 0).map(([id]) => id)).size;
  const coveredUnitCount = [...unitTotals.values()].filter(n => n > 0).length;
  console.log(`\n覆盖章节数: ${chapterCount}（有题章节，含单元级）`);
  console.log(`覆盖单元数: ${coveredUnitCount} / ${unitTotals.size}`);
  console.log(`总耗时: ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

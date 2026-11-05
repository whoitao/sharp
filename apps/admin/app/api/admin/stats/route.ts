import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { buildChapterParentMap, resolveChapterRoot } from "@/lib/textbook";
import { handleRouteError } from "@/lib/http";
import { statsQuerySchema } from "@/lib/schemas";
import { withTtlCache } from "@/lib/cache";
import { NextRequest, NextResponse } from "next/server";

const CACHE_TTL = 30_000;

const dateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

interface TrendPoint {
  date: string;
  questions: number;
  duration: number;
  sessions: number;
}

/**
 * 管理端学习统计：全部指标来自不可变的学习事实（StudyAttempt + StudyAttemptItem）。
 * 聚合尽量下推到数据库（aggregate / groupBy / 单条 SQL），只有「章节叶子 → 顶级章」
 * 的归并和日期补零留在内存，因为这两件事依赖应用侧的树结构与展示口径。
 */
async function computeStats(options: {
  days: number;
  gradeId?: bigint;
  subjectId?: bigint;
}) {
  const { days, gradeId, subjectId } = options;

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const where: Prisma.StudyAttemptWhereInput = { finishedAt: { gte: since } };
  const andConditions: Prisma.StudyAttemptWhereInput[] = [];
  if (gradeId) {
    andConditions.push({
      OR: [{ gradeId }, { chapter: { textbook: { gradeId } } }],
    });
  }
  if (subjectId) {
    andConditions.push({
      OR: [{ subjectId }, { chapter: { textbook: { subjectId } } }],
    });
  }
  if (andConditions.length > 0) where.AND = andConditions;

  const [aggregate, activeUserRows, recentAttempts, chapterGroups, chapters] = await Promise.all([
    prisma.studyAttempt.aggregate({
      where,
      _count: { _all: true },
      _sum: {
        totalQuestions: true,
        correctCount: true,
        wrongCount: true,
        durationSeconds: true,
      },
    }),
    prisma.studyAttempt.groupBy({ by: ["userId"], where }),
    prisma.studyAttempt.findMany({
      where,
      orderBy: { finishedAt: "desc" },
      take: 10,
      include: {
        user: { select: { username: true, nickname: true } },
        chapter: {
          select: {
            id: true,
            name: true,
            parentId: true,
            textbook: { select: { subject: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.studyAttempt.groupBy({
      by: ["chapterId"],
      where,
      _count: { _all: true },
      _sum: {
        totalQuestions: true,
        correctCount: true,
        wrongCount: true,
      },
    }),
    prisma.chapter.findMany({
      select: { id: true, parentId: true, name: true },
    }),
  ]);

  // KPI 总览
  const attempts = aggregate._count._all;
  const totalQuestions = aggregate._sum.totalQuestions ?? 0;
  const totalCorrect = aggregate._sum.correctCount ?? 0;
  const totalWrong = aggregate._sum.wrongCount ?? 0;
  const totalAnswered = totalCorrect + totalWrong;
  const totalDuration = aggregate._sum.durationSeconds ?? 0;
  const activeUsers = activeUserRows.length;

  // 每日趋势：未按年级/科目过滤时直接读 UserDailyStat（已有按日聚合）；
  // 过滤条件下 UserDailyStat 没有 grade/subject 维度，只能退回轻量字段查询后按日汇总。
  const trendMap = new Map<string, TrendPoint>();
  for (let i = 0; i < days; i++) {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    trendMap.set(dateKey(date), { date: dateKey(date), questions: 0, duration: 0, sessions: 0 });
  }

  const filtered = Boolean(gradeId || subjectId);
  if (filtered) {
    const lightAttempts = await prisma.studyAttempt.findMany({
      where,
      select: { finishedAt: true, totalQuestions: true, durationSeconds: true },
    });
    for (const attempt of lightAttempts) {
      const entry = trendMap.get(dateKey(attempt.finishedAt));
      if (!entry) continue;
      entry.questions += attempt.totalQuestions;
      entry.duration += attempt.durationSeconds;
      entry.sessions += 1;
    }
  } else {
    const dailyGroups = await prisma.userDailyStat.groupBy({
      by: ["date"],
      where: { date: { gte: since } },
      _sum: { questionsAnswered: true, sessionsCompleted: true, studyDuration: true },
    });
    for (const group of dailyGroups) {
      const entry = trendMap.get(dateKey(group.date));
      if (!entry) continue;
      entry.questions += group._sum.questionsAnswered ?? 0;
      entry.duration += group._sum.studyDuration ?? 0;
      entry.sessions += group._sum.sessionsCompleted ?? 0;
    }
  }

  const trend = Array.from(trendMap.values());

  // 按章节（顶级章聚合子节）：数据库按叶子 chapterId 聚合，再在内存里向上归并
  const parentOf = buildChapterParentMap(chapters);
  const rootNames = new Map(chapters.map((c) => [c.id.toString(), c.name]));

  const chapterMap = new Map<
    string,
    { id: string; name: string; attempts: number; questions: number; correct: number; answered: number }
  >();
  for (const group of chapterGroups) {
    if (!group.chapterId) continue;
    const rootId = resolveChapterRoot(group.chapterId, parentOf).toString();
    const entry = chapterMap.get(rootId) ?? {
      id: rootId,
      name: rootNames.get(rootId) ?? rootId,
      attempts: 0,
      questions: 0,
      correct: 0,
      answered: 0,
    };
    const correct = group._sum.correctCount ?? 0;
    entry.attempts += group._count._all;
    entry.questions += group._sum.totalQuestions ?? 0;
    entry.correct += correct;
    entry.answered += correct + (group._sum.wrongCount ?? 0);
    chapterMap.set(rootId, entry);
  }
  const chapterStats = Array.from(chapterMap.values())
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      attempts: entry.attempts,
      questions: entry.questions,
      accuracy: entry.answered > 0 ? Math.round((entry.correct / entry.answered) * 100) : 0,
    }))
    .sort((a, b) => b.questions - a.questions)
    .slice(0, 10);

  // 按知识点：需要 attempt → item → question → knowledgePoint 多表连接，
  // Prisma 无法跨关系 groupBy，这里用一条聚合 SQL 下推，避免把全量 item 拉到内存。
  const sqlFilters: Prisma.Sql[] = [Prisma.sql`a."finishedAt" >= ${since}`];
  if (gradeId) {
    sqlFilters.push(Prisma.sql`(a."gradeId" = ${gradeId} OR tb."gradeId" = ${gradeId})`);
  }
  if (subjectId) {
    sqlFilters.push(Prisma.sql`(a."subjectId" = ${subjectId} OR tb."subjectId" = ${subjectId})`);
  }

  const knowledgePointRows = await prisma.$queryRaw<
    Array<{ id: string; name: string; questions: number; correct: number; sessions: number }>
  >(Prisma.sql`
    SELECT kp.id::text AS id,
           kp.name AS name,
           COUNT(*)::int AS questions,
           COALESCE(SUM(CASE WHEN i."isCorrect" THEN 1 ELSE 0 END), 0)::int AS correct,
           COUNT(DISTINCT a.id)::int AS sessions
    FROM "StudyAttemptItem" i
    JOIN "StudyAttempt" a ON a.id = i."attemptId"
    LEFT JOIN "Chapter" c ON c.id = a."chapterId"
    LEFT JOIN "Textbook" tb ON tb.id = c."textbookId"
    JOIN "QuestionKnowledgePoint" qkp ON qkp."questionId" = i."questionId"
    JOIN "KnowledgePoint" kp ON kp.id = qkp."knowledgePointId"
    WHERE ${Prisma.join(sqlFilters, " AND ")}
    GROUP BY kp.id, kp.name
    ORDER BY questions DESC
    LIMIT 10
  `);

  const knowledgePointStats = knowledgePointRows.map((row) => ({
    id: row.id,
    name: row.name,
    attempts: row.sessions,
    questions: row.questions,
    accuracy: row.questions > 0 ? Math.round((row.correct / row.questions) * 100) : 0,
  }));

  // 最近学习流水（独立查询，只取 10 条，不再全量加载）
  const recent = recentAttempts.map((attempt) => ({
    id: attempt.id,
    user: attempt.user.nickname || attempt.user.username,
    scope: attempt.scopeType,
    chapterName: attempt.chapter?.name ?? null,
    subjectName: attempt.chapter?.textbook?.subject?.name ?? null,
    totalQuestions: attempt.totalQuestions,
    correctCount: attempt.correctCount,
    wrongCount: attempt.wrongCount,
    durationSeconds: attempt.durationSeconds,
    finishedAt: attempt.finishedAt,
  }));

  return {
    kpis: {
      attempts,
      questions: totalQuestions,
      accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
      activeUsers,
      duration: totalDuration,
    },
    trend,
    chapters: chapterStats,
    knowledgePoints: knowledgePointStats,
    recent,
  };
}

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "dashboard");
  if (admin instanceof NextResponse) return admin;

  try {
    const { days, gradeId, subjectId } = statsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    // 缓存 key 维度：统计窗口 + 年级 + 科目（数据是全局的，与操作者无关）
    const cacheKey = `stats:${days}:${gradeId?.toString() ?? "-"}:${subjectId?.toString() ?? "-"}`;
    const data = await withTtlCache(cacheKey, CACHE_TTL, () =>
      computeStats({ days, gradeId, subjectId }),
    );

    return NextResponse.json(data);
  } catch (err) {
    return handleRouteError(err, "admin/stats");
  }
}

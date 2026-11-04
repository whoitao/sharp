import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { buildChapterParentMap, resolveChapterRoot } from "@/lib/textbook";
import { NextRequest, NextResponse } from "next/server";

const dateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// 管理端学习统计：全部指标来自不可变的学习事实（StudyAttempt + StudyAttemptItem）。
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "dashboard");
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") || "14")));
  const gradeIdRaw = searchParams.get("gradeId");
  const subjectIdRaw = searchParams.get("subjectId");

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const where: Record<string, unknown> = { finishedAt: { gte: since } };
  const andConditions: Record<string, unknown>[] = [];
  if (gradeIdRaw) {
    const gradeId = BigInt(gradeIdRaw);
    andConditions.push({
      OR: [{ gradeId }, { chapter: { textbook: { gradeId } } }],
    });
  }
  if (subjectIdRaw) {
    const subjectId = BigInt(subjectIdRaw);
    andConditions.push({
      OR: [{ subjectId }, { chapter: { textbook: { subjectId } } }],
    });
  }
  if (andConditions.length > 0) where.AND = andConditions;

  const attempts = await prisma.studyAttempt.findMany({
    where,
    orderBy: { finishedAt: "desc" },
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
      items: { select: { questionId: true, isCorrect: true } },
    },
  });

  // KPI 总览
  const totalQuestions = attempts.reduce((sum, a) => sum + a.totalQuestions, 0);
  const totalCorrect = attempts.reduce((sum, a) => sum + a.correctCount, 0);
  const totalAnswered = attempts.reduce((sum, a) => sum + a.correctCount + a.wrongCount, 0);
  const totalDuration = attempts.reduce((sum, a) => sum + a.durationSeconds, 0);
  const activeUsers = new Set(attempts.map((a) => a.userId)).size;

  // 每日趋势（补齐窗口内没有学习的日期）
  const trendMap = new Map<string, { questions: number; duration: number; sessions: number }>();
  for (let i = 0; i < days; i++) {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    trendMap.set(dateKey(date), { questions: 0, duration: 0, sessions: 0 });
  }
  for (const attempt of attempts) {
    const key = dateKey(attempt.finishedAt);
    const entry = trendMap.get(key);
    if (!entry) continue;
    entry.questions += attempt.totalQuestions;
    entry.duration += attempt.durationSeconds;
    entry.sessions += 1;
  }
  const trend = Array.from(trendMap.entries()).map(([date, value]) => ({ date, ...value }));

  // 按章节（顶级章聚合子节）
  const chapters = await prisma.chapter.findMany({
    select: { id: true, parentId: true, name: true },
  });
  const parentOf = buildChapterParentMap(chapters);
  const rootNames = new Map(chapters.map((c) => [c.id.toString(), c.name]));

  const chapterMap = new Map<
    string,
    { id: string; name: string; attempts: number; questions: number; correct: number; answered: number }
  >();
  for (const attempt of attempts) {
    if (!attempt.chapterId) continue;
    const rootId = resolveChapterRoot(attempt.chapterId, parentOf).toString();
    const entry = chapterMap.get(rootId) ?? {
      id: rootId,
      name: rootNames.get(rootId) ?? String(attempt.chapter?.name ?? rootId),
      attempts: 0,
      questions: 0,
      correct: 0,
      answered: 0,
    };
    entry.attempts += 1;
    entry.questions += attempt.totalQuestions;
    entry.correct += attempt.correctCount;
    entry.answered += attempt.correctCount + attempt.wrongCount;
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

  // 按知识点（以题目自身的知识点归属为准，一题可命中多个知识点）
  const questionIds = new Set<string>();
  for (const attempt of attempts) {
    for (const item of attempt.items) questionIds.add(item.questionId.toString());
  }

  const knowledgePointStats: {
    id: string;
    name: string;
    attempts: number;
    questions: number;
    accuracy: number;
  }[] = [];

  if (questionIds.size > 0) {
    const links = await prisma.questionKnowledgePoint.findMany({
      where: { questionId: { in: Array.from(questionIds).map((id) => BigInt(id)) } },
      select: {
        questionId: true,
        knowledgePoint: { select: { id: true, name: true } },
      },
    });

    // questionId → knowledgePoint
    const kpByQuestion = new Map<string, { id: string; name: string }[]>();
    for (const link of links) {
      const key = link.questionId.toString();
      const list = kpByQuestion.get(key);
      const kp = { id: link.knowledgePoint.id.toString(), name: link.knowledgePoint.name };
      if (list) list.push(kp);
      else kpByQuestion.set(key, [kp]);
    }

    const kpMap = new Map<
      string,
      { id: string; name: string; questions: number; correct: number; sessions: Set<string> }
    >();

    for (const attempt of attempts) {
      for (const item of attempt.items) {
        const kps = kpByQuestion.get(item.questionId.toString());
        if (!kps) continue;
        for (const kp of kps) {
          const entry = kpMap.get(kp.id) ?? {
            id: kp.id,
            name: kp.name,
            questions: 0,
            correct: 0,
            sessions: new Set<string>(),
          };
          entry.questions += 1;
          if (item.isCorrect) entry.correct += 1;
          entry.sessions.add(attempt.id);
          kpMap.set(kp.id, entry);
        }
      }
    }

    for (const entry of kpMap.values()) {
      knowledgePointStats.push({
        id: entry.id,
        name: entry.name,
        attempts: entry.sessions.size,
        questions: entry.questions,
        accuracy: entry.questions > 0 ? Math.round((entry.correct / entry.questions) * 100) : 0,
      });
    }
    knowledgePointStats.sort((a, b) => b.questions - a.questions);
    knowledgePointStats.splice(10);
  }

  // 最近学习流水
  const recent = attempts.slice(0, 10).map((attempt) => ({
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

  return NextResponse.json({
    kpis: {
      attempts: attempts.length,
      questions: totalQuestions,
      accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
      activeUsers,
      duration: totalDuration,
    },
    trend,
    chapters: chapterStats,
    knowledgePoints: knowledgePointStats,
    recent,
  });
}

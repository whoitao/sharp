import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// 按知识点学习统计：以题目自身的知识点归属为准（而不是学习时选择的筛选条件），
// 父级知识点按题目去重后聚合子树。数据来自不可变的 StudyAttempt / StudyAttemptItem。
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { searchParams } = new URL(request.url);
  const stageIdRaw = searchParams.get("stageId");
  const subjectIdRaw = searchParams.get("subjectId");

  const kpWhere: Record<string, unknown> = {};
  if (stageIdRaw) kpWhere.stageId = BigInt(stageIdRaw);
  if (subjectIdRaw) kpWhere.subjectId = BigInt(subjectIdRaw);

  const knowledgePoints = await prisma.knowledgePoint.findMany({
    where: kpWhere,
    select: { id: true, name: true, parentId: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  if (knowledgePoints.length === 0) {
    return NextResponse.json([]);
  }

  const kpIds = knowledgePoints.map((kp) => kp.id);
  const kpIdSet = new Set(kpIds.map((id) => id.toString()));

  // 本次作答过的题目 + 每题最近一次对错
  const attempts = await prisma.studyAttempt.findMany({
    where: { userId: appUser.id },
    select: {
      finishedAt: true,
      items: { select: { questionId: true, isCorrect: true } },
    },
    orderBy: { finishedAt: "asc" },
  });

  const answeredQuestionIds = new Set<string>();
  const latestCorrect = new Map<string, boolean>();
  const lastPracticedByQuestion = new Map<string, Date>();

  for (const attempt of attempts) {
    for (const item of attempt.items) {
      const questionId = item.questionId.toString();
      answeredQuestionIds.add(questionId);
      latestCorrect.set(questionId, item.isCorrect);
      const previous = lastPracticedByQuestion.get(questionId);
      if (!previous || attempt.finishedAt > previous) {
        lastPracticedByQuestion.set(questionId, attempt.finishedAt);
      }
    }
  }

  // 知识点 → 题目：一次取全量映射，既算总题数也算作答覆盖
  const questionLinks = await prisma.questionKnowledgePoint.findMany({
    where: { knowledgePointId: { in: kpIds } },
    select: { questionId: true, knowledgePointId: true },
  });

  const directTotals = new Map<string, Set<string>>();
  const directAnswered = new Map<string, Set<string>>();
  const directCorrect = new Map<string, Set<string>>();
  const directLastAt = new Map<string, Date>();

  for (const link of questionLinks) {
    const kpId = link.knowledgePointId.toString();
    const questionId = link.questionId.toString();

    let totalSet = directTotals.get(kpId);
    if (!totalSet) {
      totalSet = new Set();
      directTotals.set(kpId, totalSet);
    }
    totalSet.add(questionId);

    if (answeredQuestionIds.has(questionId)) {
      let answeredSet = directAnswered.get(kpId);
      if (!answeredSet) {
        answeredSet = new Set();
        directAnswered.set(kpId, answeredSet);
      }
      answeredSet.add(questionId);

      if (latestCorrect.get(questionId)) {
        let correctSet = directCorrect.get(kpId);
        if (!correctSet) {
          correctSet = new Set();
          directCorrect.set(kpId, correctSet);
        }
        correctSet.add(questionId);
      }

      const practicedAt = lastPracticedByQuestion.get(questionId);
      if (practicedAt) {
        const previous = directLastAt.get(kpId);
        if (!previous || practicedAt > previous) directLastAt.set(kpId, practicedAt);
      }
    }
  }

  const childrenOf = new Map<string, typeof knowledgePoints>();
  for (const kp of knowledgePoints) {
    if (!kp.parentId) continue;
    const key = kp.parentId.toString();
    const list = childrenOf.get(key);
    if (list) list.push(kp);
    else childrenOf.set(key, [kp]);
  }

  interface Aggregate {
    total: Set<string>;
    answered: Set<string>;
    correct: Set<string>;
    lastAt: Date | null;
  }

  const buildNode = (
    kp: (typeof knowledgePoints)[number],
  ): { node: Record<string, unknown>; agg: Aggregate } => {
    const kpId = kp.id.toString();
    const agg: Aggregate = {
      total: new Set(directTotals.get(kpId) ?? []),
      answered: new Set(directAnswered.get(kpId) ?? []),
      correct: new Set(directCorrect.get(kpId) ?? []),
      lastAt: directLastAt.get(kpId) ?? null,
    };

    const children = (childrenOf.get(kpId) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder || Number(a.id - b.id))
      .map((child) => {
        const { node: childNode, agg: childAgg } = buildNode(child);
        // 父级按题目去重后聚合子树
        childAgg.total.forEach((questionId) => agg.total.add(questionId));
        childAgg.answered.forEach((questionId) => agg.answered.add(questionId));
        childAgg.correct.forEach((questionId) => agg.correct.add(questionId));
        if (childAgg.lastAt && (!agg.lastAt || childAgg.lastAt > agg.lastAt)) {
          agg.lastAt = childAgg.lastAt;
        }
        return childNode;
      });

    return {
      node: {
        id: kpId,
        name: kp.name,
        parentId: kp.parentId?.toString() ?? null,
        totalQuestions: agg.total.size,
        answeredQuestions: agg.answered.size,
        correctQuestions: agg.correct.size,
        lastPracticedAt: agg.lastAt,
        children,
      },
      agg,
    };
  };

  const roots = knowledgePoints
    .filter((kp) => !kp.parentId || !kpIdSet.has(kp.parentId.toString()))
    .sort((a, b) => a.sortOrder - b.sortOrder || Number(a.id - b.id))
    .map((kp) => buildNode(kp).node);

  return NextResponse.json(roots);
}

import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import {
  buildChapterParentMap,
  collectChapterSubtreeIds,
  resolveChapterRoot,
} from "@/lib/textbook";
import { NextRequest, NextResponse } from "next/server";

// 按章节学习统计：按教材的顶级「章」聚合（含子节题目）。
// 统计口径来自不可变的学习事实（StudyAttempt + StudyAttemptItem），与单元序号无关。
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { searchParams } = new URL(request.url);
  const textbookIdRaw = searchParams.get("textbookId");
  if (!textbookIdRaw) {
    return NextResponse.json({ error: "textbookId is required" }, { status: 400 });
  }
  const textbookId = BigInt(textbookIdRaw);

  const chapters = await prisma.chapter.findMany({
    where: { textbookId },
    select: { id: true, parentId: true, name: true, level: true, sortOrder: true },
  });
  const parentOf = buildChapterParentMap(chapters);

  const rootByChapterId = new Map<string, string>();
  for (const chapter of chapters) {
    rootByChapterId.set(
      chapter.id.toString(),
      resolveChapterRoot(chapter.id, parentOf).toString(),
    );
  }

  const roots = chapters
    .filter((chapter) => chapter.level === 1)
    .sort((a, b) => a.sortOrder - b.sortOrder || Number(a.id - b.id));

  const subtreeByRoot = new Map<string, bigint[]>(
    roots.map((root) => [root.id.toString(), collectChapterSubtreeIds(root.id, parentOf)]),
  );

  const [attempts, questionCounts] = await Promise.all([
    prisma.studyAttempt.findMany({
      where: {
        userId: appUser.id,
        chapterId: { not: null },
        chapter: { textbookId },
      },
      select: {
        chapterId: true,
        finishedAt: true,
        items: { select: { questionId: true, isCorrect: true } },
      },
      orderBy: { finishedAt: "asc" },
    }),
    prisma.question.groupBy({
      by: ["chapterId"],
      where: { chapterId: { in: chapters.map((chapter) => chapter.id) } },
      _count: { _all: true },
    }),
  ]);

  const directQuestionCount = new Map<string, number>();
  for (const row of questionCounts) {
    if (row.chapterId === null) continue;
    directQuestionCount.set(row.chapterId.toString(), row._count._all);
  }

  const aggByRoot = new Map<
    string,
    { answered: Set<string>; latest: Map<string, boolean>; lastAt: Date | null }
  >();
  for (const root of roots) {
    aggByRoot.set(root.id.toString(), {
      answered: new Set(),
      latest: new Map(),
      lastAt: null,
    });
  }

  for (const attempt of attempts) {
    if (!attempt.chapterId) continue;
    const rootId = rootByChapterId.get(attempt.chapterId.toString());
    const agg = rootId ? aggByRoot.get(rootId) : null;
    if (!agg) continue;

    for (const item of attempt.items) {
      const questionId = item.questionId.toString();
      agg.answered.add(questionId);
      agg.latest.set(questionId, item.isCorrect);
    }
    if (!agg.lastAt || attempt.finishedAt > agg.lastAt) {
      agg.lastAt = attempt.finishedAt;
    }
  }

  const data = roots.map((root) => {
    const rootId = root.id.toString();
    const subtree = subtreeByRoot.get(rootId) ?? [root.id];
    const totalQuestions = subtree.reduce(
      (sum, id) => sum + (directQuestionCount.get(id.toString()) ?? 0),
      0,
    );
    const agg = aggByRoot.get(rootId)!;
    let correctQuestions = 0;
    agg.latest.forEach((isCorrect) => {
      if (isCorrect) correctQuestions++;
    });

    return {
      id: rootId,
      name: root.name,
      totalQuestions,
      answeredQuestions: agg.answered.size,
      correctQuestions,
      lastPracticedAt: agg.lastAt,
    };
  });

  return NextResponse.json(data);
}

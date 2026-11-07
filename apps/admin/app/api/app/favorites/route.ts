import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 收藏 / 取消收藏共用：题目 id 必须是纯数字（BigInt） */
function parseQuestionId(raw: string | null | undefined): bigint | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

/**
 * 我的收藏列表。
 * 分页、筛选口径与「错题本」保持一致：gradeId/subjectId 过滤题目自身字段，
 * textbookId 通过 chapter.textbookId 过滤。
 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

  const gradeId = parseQuestionId(searchParams.get("gradeId"));
  const subjectId = parseQuestionId(searchParams.get("subjectId"));
  const textbookId = parseQuestionId(searchParams.get("textbookId"));

  const where = {
    userId: appUser.id,
    ...(gradeId || subjectId || textbookId
      ? {
          question: {
            ...(gradeId ? { gradeId } : {}),
            ...(subjectId ? { subjectId } : {}),
            ...(textbookId ? { chapter: { textbookId } } : {}),
          },
        }
      : {}),
  };

  const [total, records] = await Promise.all([
    prisma.userQuestionFavorite.count({ where }),
    prisma.userQuestionFavorite.findMany({
      where,
      include: {
        question: {
          include: {
            options: { orderBy: { sortNo: "asc" } },
            chapter: { include: { textbook: { select: { id: true, name: true } } } },
          },
        },
      },
      // createdAt 相同（批量导入）时用 questionId 兜底，保证翻页稳定
      orderBy: [{ createdAt: "desc" }, { questionId: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const data = records.map((record: any) => ({
    questionId: record.questionId.toString(),
    createdAt: record.createdAt,
    note: record.note,
    question: {
      id: record.question.id.toString(),
      gradeId: record.question.gradeId?.toString() ?? null,
      subjectId: record.question.subjectId?.toString() ?? null,
      chapterId: record.question.chapterId?.toString() ?? null,
      type: record.question.type,
      content: record.question.content,
      analysis: record.question.analysis,
      difficulty: record.question.difficulty,
      score: record.question.score,
      chapter: record.question.chapter
        ? {
            id: record.question.chapter.id.toString(),
            name: record.question.chapter.name,
            textbookId: record.question.chapter.textbookId.toString(),
            textbookName: record.question.chapter.textbook?.name ?? null,
          }
        : null,
      options: record.question.options.map((o: any) => ({
        id: o.id.toString(),
        questionId: o.questionId.toString(),
        optionKey: o.optionKey,
        content: o.content,
        isCorrect: o.isCorrect,
        sortNo: o.sortNo,
      })),
    },
  }));

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

/**
 * 收藏题目。幂等：重复收藏返回与首次一致的 createdAt。
 */
export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = await request.json().catch(() => null);
  const questionId = parseQuestionId(
    body && typeof body.questionId === "string" ? body.questionId : String(body?.questionId ?? ""),
  );
  if (!questionId) {
    return NextResponse.json({ error: "Invalid questionId" }, { status: 400 });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // skipDuplicates 让并发/重试下也不会抛唯一键冲突
  await prisma.userQuestionFavorite.createMany({
    data: [{ userId: appUser.id, questionId }],
    skipDuplicates: true,
  });

  const favorite = await prisma.userQuestionFavorite.findUnique({
    where: { userId_questionId: { userId: appUser.id, questionId } },
    select: { createdAt: true },
  });

  return NextResponse.json({
    data: {
      questionId: questionId.toString(),
      isFavorited: true,
      createdAt: favorite?.createdAt ?? null,
    },
  });
}

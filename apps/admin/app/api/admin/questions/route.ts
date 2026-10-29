import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const subjectId = searchParams.get("subjectId");
  const gradeId = searchParams.get("gradeId");
  const knowledgePointId = searchParams.get("knowledgePointId");
  const chapterId = searchParams.get("chapterId");
  const tagId = searchParams.get("tagId");
  const source = searchParams.get("source");
  const search = searchParams.get("search")?.trim();

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10) || 10)
  );

  const where: any = {};
  if (categoryId) {
    where.categoryId = BigInt(categoryId);
  }
  if (subjectId) {
    where.subjectId = BigInt(subjectId);
  }
  if (gradeId) {
    where.gradeId = BigInt(gradeId);
  }
  if (knowledgePointId) {
    where.knowledgePoints = {
      some: { knowledgePointId: BigInt(knowledgePointId) },
    };
  }
  if (chapterId) {
    where.chapterId = BigInt(chapterId);
  }
  if (tagId) {
    where.tags = { some: { tagId: BigInt(tagId) } };
  }
  if (source) {
    where.source = source;
  }
  if (search) {
    where.content = { contains: search, mode: "insensitive" };
  }

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        options: { orderBy: { sortNo: "asc" } },
        category: { select: { name: true } },
        subject: true,
        grade: { select: { name: true, stage: true } },
        chapter: {
          select: {
            id: true,
            name: true,
            grade: { select: { name: true } },
            publisher: { select: { name: true } },
          },
        },
        knowledgePoints: {
          include: { knowledgePoint: true },
        },
        tags: { include: { tag: true } },
      },
      orderBy: { sortOrder: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ]);

  const serialize = (q: any) => ({
    id: q.id.toString(),
    categoryId: q.categoryId.toString(),
    categoryName: q.category?.name ?? null,
    gradeId: q.gradeId?.toString() ?? null,
    gradeName: q.grade?.name ?? null,
    subjectId: q.subjectId?.toString() ?? null,
    subjectName: q.subject?.name ?? null,
    type: q.type,
    content: q.content,
    analysis: q.analysis,
    difficulty: q.difficulty,
    score: q.score,
    sortOrder: q.sortOrder,
    // 教材归属与来源
    chapterId: q.chapterId?.toString() ?? null,
    chapterName: q.chapter?.name ?? null,
    textbookLabel: q.chapter
      ? `${q.chapter.publisher?.name ?? ""} · ${q.chapter.grade?.name ?? ""}`.replace(/^ · /, "")
      : null,
    source: q.source,
    createdAt: q.createdAt,
    options: q.options.map((o: any) => ({
      id: o.id.toString(),
      questionId: o.questionId.toString(),
      optionKey: o.optionKey,
      content: o.content,
      isCorrect: o.isCorrect,
      sortNo: o.sortNo,
    })),
    knowledgePoints: q.knowledgePoints.map((qkp: any) => ({
      id: qkp.knowledgePoint.id.toString(),
      name: qkp.knowledgePoint.name,
      parentId: qkp.knowledgePoint.parentId?.toString() ?? null,
    })),
    tags: (q.tags ?? []).map((link: any) => ({
      id: link.tag.id.toString(),
      name: link.tag.name,
      type: link.tag.type,
    })),
  });

  return NextResponse.json({
    items: questions.map(serialize),
    total,
    page,
    pageSize,
  });
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const {
    categoryId,
    gradeId,
    subjectId,
    type,
    content,
    analysis,
    difficulty = 1,
    score = 1,
    sortOrder = 0,
    chapterId,
    source = "custom",
    options,
    knowledgePointIds,
    tagIds,
  } = body;

  if (!categoryId || !type || !content) {
    return NextResponse.json(
      { error: "categoryId, type, and content are required" },
      { status: 400 }
    );
  }

  if (!options || !Array.isArray(options) || options.length === 0) {
    return NextResponse.json(
      { error: "At least one option is required" },
      { status: 400 }
    );
  }

  // 教材归属：传了 chapterId 必须存在，年级与科目直接由章节反推
  let chapter: { id: bigint; gradeId: bigint; subjectId: bigint } | null = null;
  if (chapterId) {
    chapter = await prisma.chapter.findUnique({
      where: { id: BigInt(chapterId) },
      select: { id: true, gradeId: true, subjectId: true },
    });
    if (!chapter) {
      return NextResponse.json({ error: "chapter not found" }, { status: 400 });
    }
  }

  // 年级必填（教材题由章节反推）
  const finalGradeId = chapter ? chapter.gradeId : gradeId ? BigInt(gradeId) : null;
  if (!finalGradeId) {
    return NextResponse.json({ error: "gradeId 或 chapterId 必填" }, { status: 400 });
  }
  const finalSubjectId = chapter ? chapter.subjectId : subjectId ? BigInt(subjectId) : null;

  if (!["exam", "textbook", "mock", "custom"].includes(source)) {
    return NextResponse.json(
      { error: "source must be one of exam/textbook/mock/custom" },
      { status: 400 }
    );
  }

  const question = await prisma.question.create({
    data: {
      categoryId: BigInt(categoryId),
      gradeId: finalGradeId,
      subjectId: finalSubjectId,
      type,
      content,
      analysis: analysis || null,
      difficulty,
      score,
      sortOrder,
      chapterId: chapter?.id ?? null,
      source,
      options: {
        create: options.map((opt: any, idx: number) => ({
          optionKey: opt.optionKey,
          content: opt.content,
          isCorrect: opt.isCorrect || false,
          sortNo: idx,
        })),
      },
      ...(Array.isArray(knowledgePointIds) && knowledgePointIds.length > 0
        ? {
            knowledgePoints: {
              create: knowledgePointIds.map((kpId: string) => ({
                knowledgePointId: BigInt(kpId),
              })),
            },
          }
        : {}),
      ...(Array.isArray(tagIds) && tagIds.length > 0
        ? {
            tags: {
              create: tagIds.map((tagId: string) => ({ tagId: BigInt(tagId) })),
            },
          }
        : {}),
    },
    include: {
      options: true,
      knowledgePoints: {
        include: { knowledgePoint: true },
      },
      tags: { include: { tag: true } },
    },
  });

  const serialize = (q: any) => ({
    ...q,
    id: q.id.toString(),
    categoryId: q.categoryId.toString(),
    gradeId: q.gradeId?.toString() ?? null,
    subjectId: q.subjectId?.toString() ?? null,
    // BigInt 不能直接 JSON 序列化，必须转字符串
    chapterId: q.chapterId?.toString() ?? null,
    source: q.source,
    options: q.options.map((o: any) => ({
      ...o,
      id: o.id.toString(),
      questionId: o.questionId.toString(),
    })),
    knowledgePoints: q.knowledgePoints.map((qkp: any) => ({
      id: qkp.knowledgePoint.id.toString(),
      name: qkp.knowledgePoint.name,
      parentId: qkp.knowledgePoint.parentId?.toString() ?? null,
    })),
    tags: (q.tags ?? []).map((link: any) => ({
      id: link.tag.id.toString(),
      name: link.tag.name,
      type: link.tag.type,
    })),
  });

  return NextResponse.json(serialize(question), { status: 201 });
}

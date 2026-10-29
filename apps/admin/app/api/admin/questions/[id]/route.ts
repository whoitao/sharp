import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await request.json();
  const { categoryId, subjectId, type, content, analysis, difficulty, score, sortOrder, chapterId, source, options, knowledgePointIds } = body;

  const data: Record<string, any> = {};
  if (categoryId !== undefined) data.categoryId = BigInt(categoryId);
  if (subjectId !== undefined) data.subjectId = subjectId ? BigInt(subjectId) : null;
  if (type !== undefined) data.type = type;
  if (content !== undefined) data.content = content;
  if (analysis !== undefined) data.analysis = analysis || null;
  if (difficulty !== undefined) data.difficulty = difficulty;
  if (score !== undefined) data.score = score;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  // 教材归属：null / 空字符串表示取消归属；传了值必须存在
  if (chapterId !== undefined) {
    if (!chapterId) {
      data.chapterId = null;
    } else {
      const chapter = await prisma.chapter.findUnique({ where: { id: BigInt(chapterId) } });
      if (!chapter) {
        return NextResponse.json({ error: "chapter not found" }, { status: 400 });
      }
      data.chapterId = chapter.id;
    }
  }

  if (source !== undefined) {
    if (!["exam", "textbook", "mock", "custom"].includes(source)) {
      return NextResponse.json(
        { error: "source must be one of exam/textbook/mock/custom" },
        { status: 400 }
      );
    }
    data.source = source;
  }

  // If options are provided, delete old and create new
  if (options && Array.isArray(options)) {
    await prisma.questionOption.deleteMany({
      where: { questionId: BigInt(id) },
    });

    await prisma.question.update({
      where: { id: BigInt(id) },
      data: {
        ...data,
        options: {
          create: options.map((opt: any, idx: number) => ({
            optionKey: opt.optionKey,
            content: opt.content,
            isCorrect: opt.isCorrect || false,
            sortNo: idx,
          })),
        },
      },
    });
  } else {
    await prisma.question.update({
      where: { id: BigInt(id) },
      data,
    });
  }

  // Update knowledge points if provided
  if (Array.isArray(knowledgePointIds)) {
    await prisma.questionKnowledgePoint.deleteMany({
      where: { questionId: BigInt(id) },
    });
    if (knowledgePointIds.length > 0) {
      await prisma.questionKnowledgePoint.createMany({
        data: knowledgePointIds.map((kpId: string) => ({
          questionId: BigInt(id),
          knowledgePointId: BigInt(kpId),
        })),
      });
    }
  }

  const question = await prisma.question.findUnique({
    where: { id: BigInt(id) },
    include: {
      options: { orderBy: { sortNo: "asc" } },
      knowledgePoints: {
        include: { knowledgePoint: true },
      },
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const serialize = (q: any) => ({
    ...q,
    id: q.id.toString(),
    categoryId: q.categoryId.toString(),
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
  });

  return NextResponse.json(serialize(question));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  // Delete options first
  await prisma.questionOption.deleteMany({
    where: { questionId: BigInt(id) },
  });

  // Delete knowledge point relations
  await prisma.questionKnowledgePoint.deleteMany({
    where: { questionId: BigInt(id) },
  });

  // Delete progress records
  await prisma.userQuestionProgress.deleteMany({
    where: { questionId: BigInt(id) },
  });

  // Delete question
  await prisma.question.delete({
    where: { id: BigInt(id) },
  });

  return NextResponse.json({ success: true });
}

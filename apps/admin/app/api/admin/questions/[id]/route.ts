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
  const { categoryId, type, content, analysis, difficulty, score, sortOrder, options } = body;

  const data: Record<string, any> = {};
  if (categoryId !== undefined) data.categoryId = BigInt(categoryId);
  if (type !== undefined) data.type = type;
  if (content !== undefined) data.content = content;
  if (analysis !== undefined) data.analysis = analysis || null;
  if (difficulty !== undefined) data.difficulty = difficulty;
  if (score !== undefined) data.score = score;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

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

  const question = await prisma.question.findUnique({
    where: { id: BigInt(id) },
    include: { options: { orderBy: { sortNo: "asc" } } },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const serialize = (q: any) => ({
    ...q,
    id: q.id.toString(),
    categoryId: q.categoryId.toString(),
    options: q.options.map((o: any) => ({
      ...o,
      id: o.id.toString(),
      questionId: o.questionId.toString(),
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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const subjectId = searchParams.get("subjectId");

  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "10", 10) || 10)
  );

  const where: any = { categoryId: BigInt(categoryId) };
  if (subjectId) {
    where.subjectId = BigInt(subjectId);
  }

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        options: { orderBy: { sortNo: "asc" } },
        knowledgePoints: {
          include: { knowledgePoint: true },
        },
      },
      orderBy: { sortOrder: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ]);

  const serialize = (q: any) => ({
    ...q,
    id: q.id.toString(),
    categoryId: q.categoryId.toString(),
    subjectId: q.subjectId?.toString() ?? null,
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
    subjectId,
    type,
    content,
    analysis,
    difficulty = 1,
    score = 1,
    sortOrder = 0,
    options,
    knowledgePointIds,
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

  const question = await prisma.question.create({
    data: {
      categoryId: BigInt(categoryId),
      subjectId: subjectId ? BigInt(subjectId) : null,
      type,
      content,
      analysis: analysis || null,
      difficulty,
      score,
      sortOrder,
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
    },
    include: {
      options: true,
      knowledgePoints: {
        include: { knowledgePoint: true },
      },
    },
  });

  const serialize = (q: any) => ({
    ...q,
    id: q.id.toString(),
    categoryId: q.categoryId.toString(),
    subjectId: q.subjectId?.toString() ?? null,
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

  return NextResponse.json(serialize(question), { status: 201 });
}

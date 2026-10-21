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
  const { knowledgePointIds } = body;

  if (!Array.isArray(knowledgePointIds)) {
    return NextResponse.json(
      { error: "knowledgePointIds must be an array" },
      { status: 400 }
    );
  }

  const questionId = BigInt(id);

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  await prisma.questionKnowledgePoint.deleteMany({
    where: { questionId },
  });

  if (knowledgePointIds.length > 0) {
    await prisma.questionKnowledgePoint.createMany({
      data: knowledgePointIds.map((kpId: string) => ({
        questionId,
        knowledgePointId: BigInt(kpId),
      })),
    });
  }

  const updated = await prisma.questionKnowledgePoint.findMany({
    where: { questionId },
    include: { knowledgePoint: true },
  });

  return NextResponse.json(
    updated.map((qkp) => ({
      id: qkp.knowledgePoint.id.toString(),
      name: qkp.knowledgePoint.name,
      parentId: qkp.knowledgePoint.parentId?.toString() ?? null,
    }))
  );
}

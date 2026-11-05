import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { handleRouteError } from "@/lib/http";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  knowledgePointIds: z.array(z.coerce.bigint()),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission(request, "questions");
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;
    const questionId = BigInt(id);
    const { knowledgePointIds } = bodySchema.parse(await request.json().catch(() => ({})));

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // 先删后插必须在同一事务内，避免中途失败导致知识点关联被清空
    const updated = await prisma.$transaction(async (tx) => {
      await tx.questionKnowledgePoint.deleteMany({ where: { questionId } });
      if (knowledgePointIds.length > 0) {
        await tx.questionKnowledgePoint.createMany({
          data: knowledgePointIds.map((kpId) => ({
            questionId,
            knowledgePointId: kpId,
          })),
        });
      }
      return tx.questionKnowledgePoint.findMany({
        where: { questionId },
        include: { knowledgePoint: true },
      });
    });

    return NextResponse.json(
      updated.map((qkp) => ({
        id: qkp.knowledgePoint.id.toString(),
        name: qkp.knowledgePoint.name,
        parentId: qkp.knowledgePoint.parentId?.toString() ?? null,
      }))
    );
  } catch (err) {
    return handleRouteError(err, "admin/questions/knowledge-points");
  }
}

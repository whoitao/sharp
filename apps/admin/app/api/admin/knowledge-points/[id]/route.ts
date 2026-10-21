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
  const { name, parentId, subjectId, sortOrder } = body;

  const data: Record<string, any> = {};
  if (name !== undefined) data.name = name.trim();
  if (parentId !== undefined) data.parentId = parentId ? BigInt(parentId) : null;
  if (subjectId !== undefined) data.subjectId = subjectId ? BigInt(subjectId) : null;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;

  const kp = await prisma.knowledgePoint.update({
    where: { id: BigInt(id) },
    data,
  });

  return NextResponse.json({
    id: kp.id.toString(),
    name: kp.name,
    parentId: kp.parentId?.toString() ?? null,
    subjectId: kp.subjectId?.toString() ?? null,
    sortOrder: kp.sortOrder,
    updatedAt: kp.updatedAt,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  async function deleteWithChildren(kpId: bigint) {
    const children = await prisma.knowledgePoint.findMany({
      where: { parentId: kpId },
    });
    for (const child of children) {
      await deleteWithChildren(child.id);
    }
    await prisma.questionKnowledgePoint.deleteMany({
      where: { knowledgePointId: kpId },
    });
    await prisma.knowledgePoint.delete({
      where: { id: kpId },
    });
  }

  await deleteWithChildren(BigInt(id));

  return NextResponse.json({ success: true });
}

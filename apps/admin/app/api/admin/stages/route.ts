import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 学段字典：小学 / 初中 / 高中 / 大学 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const stages = await prisma.stage.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      _count: { select: { grades: true, knowledgePoints: true } },
    },
  });

  return NextResponse.json(
    stages.map((s) => ({
      id: s.id.toString(),
      name: s.name,
      sortOrder: s.sortOrder,
      gradeCount: s._count.grades,
      knowledgePointCount: s._count.knowledgePoints,
    })),
  );
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { name, sortOrder } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: "name 必填" }, { status: 400 });
  }

  const stage = await prisma.stage.create({
    data: { name: name.trim(), sortOrder: sortOrder ?? 0 },
  });
  return NextResponse.json(
    {
      id: stage.id.toString(),
      name: stage.name,
      sortOrder: stage.sortOrder,
    },
    { status: 201 },
  );
}

export async function PATCH(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (!body.name?.trim()) return NextResponse.json({ error: "name 不能为空" }, { status: 400 });
    data.name = body.name.trim();
  }
  if (body.sortOrder != null) data.sortOrder = body.sortOrder;

  const stage = await prisma.stage.update({
    where: { id: BigInt(id) },
    data,
  });
  return NextResponse.json({
    id: stage.id.toString(),
    name: stage.name,
    sortOrder: stage.sortOrder,
  });
}

export async function DELETE(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const bigId = BigInt(id);
  const [gradeCount, knowledgePointCount] = await Promise.all([
    prisma.grade.count({ where: { stageId: bigId } }),
    prisma.knowledgePoint.count({ where: { stageId: bigId } }),
  ]);
  if (gradeCount > 0 || knowledgePointCount > 0) {
    return NextResponse.json(
      {
        error: `该学段仍有 ${gradeCount} 个年级、${knowledgePointCount} 个知识点，不能删除`,
      },
      { status: 409 },
    );
  }
  await prisma.stage.delete({ where: { id: bigId } });
  return NextResponse.json({ ok: true });
}

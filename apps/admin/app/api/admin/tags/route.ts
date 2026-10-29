import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const TYPES = ["exam", "source", "difficulty"];

/** 题目标签字典：中考真题 / 模拟题 / 课后练习… */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  const tags = await prisma.questionTag.findMany({
    where: type ? { type } : undefined,
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    include: { _count: { select: { questions: true } } },
  });

  return NextResponse.json(
    tags.map((t) => ({
      id: t.id.toString(),
      name: t.name,
      type: t.type,
      sortOrder: t.sortOrder,
      questionCount: t._count.questions,
    })),
  );
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { name, type = "source", sortOrder } = body;
  if (!name?.trim() || !TYPES.includes(type)) {
    return NextResponse.json({ error: "name 与合法 type 必填" }, { status: 400 });
  }

  const tag = await prisma.questionTag.create({
    data: { name: name.trim(), type, sortOrder: sortOrder ?? 0 },
  });
  return NextResponse.json(
    { id: tag.id.toString(), name: tag.name, type: tag.type, sortOrder: tag.sortOrder },
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
  if (body.type !== undefined) {
    if (!TYPES.includes(body.type)) return NextResponse.json({ error: "type 非法" }, { status: 400 });
    data.type = body.type;
  }
  if (body.sortOrder != null) data.sortOrder = body.sortOrder;

  const tag = await prisma.questionTag.update({ where: { id: BigInt(id) }, data });
  return NextResponse.json({
    id: tag.id.toString(),
    name: tag.name,
    type: tag.type,
    sortOrder: tag.sortOrder,
  });
}

export async function DELETE(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // 关联表配置了级联删除，删标签只断开题目关联
  await prisma.questionTag.delete({ where: { id: BigInt(id) } });
  return NextResponse.json({ ok: true });
}

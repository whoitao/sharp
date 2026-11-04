import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requirePermission(request, "pets");
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const data: Record<string, unknown> = {};
  if (body?.code !== undefined) {
    const code = String(body.code).trim();
    if (!code) return NextResponse.json({ error: "种类编码不能为空" }, { status: 400 });
    data.code = code;
  }
  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "种类名称不能为空" }, { status: 400 });
    data.name = name;
  }
  if (body?.theme !== undefined) data.theme = body.theme ? String(body.theme).trim() : null;
  if (body?.icon !== undefined) data.icon = body.icon ? String(body.icon).trim() : null;
  if (body?.tagline !== undefined) data.tagline = body.tagline ? String(body.tagline).trim() : null;
  if (body?.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;
  if (body?.enabled !== undefined) data.enabled = Boolean(body.enabled);

  try {
    const species = await prisma.petSpecies.update({
      where: { id: BigInt(id) },
      data,
    });
    return NextResponse.json({ ...species, id: species.id.toString() });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "种类编码已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: "种类不存在或更新失败" }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requirePermission(request, "pets");
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  try {
    await prisma.petSpecies.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    // 已有用户领养该种类时，Pet.speciesId 外键会阻止删除
    if (isForeignKeyViolation(err)) {
      return NextResponse.json(
        { error: "该种类下已有宠物，无法删除，可先停用" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "种类不存在" }, { status: 404 });
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2003";
}

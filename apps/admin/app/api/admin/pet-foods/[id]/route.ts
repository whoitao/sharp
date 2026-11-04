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
  if (body?.foodType !== undefined) {
    const foodType = String(body.foodType).trim();
    if (!foodType) return NextResponse.json({ error: "食物编码不能为空" }, { status: 400 });
    data.foodType = foodType;
  }
  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "食物名称不能为空" }, { status: 400 });
    data.name = name;
  }
  if (body?.icon !== undefined) data.icon = body.icon ? String(body.icon).trim() : null;
  if (body?.satietyGain !== undefined) data.satietyGain = Math.max(0, Number(body.satietyGain) || 0);
  if (body?.expGain !== undefined) data.expGain = Math.max(0, Number(body.expGain) || 0);
  if (body?.dailyCap !== undefined) data.dailyCap = Math.max(0, Number(body.dailyCap) || 0);
  if (body?.bankDailyCap !== undefined) {
    data.bankDailyCap =
      body.bankDailyCap === null || body.bankDailyCap === ""
        ? null
        : Math.max(0, Number(body.bankDailyCap) || 0);
  }
  if (body?.obtainRule !== undefined) data.obtainRule = body.obtainRule ? String(body.obtainRule).trim() : null;
  if (body?.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;
  if (body?.enabled !== undefined) data.enabled = Boolean(body.enabled);

  try {
    const food = await prisma.petFoodDef.update({ where: { id: BigInt(id) }, data });
    return NextResponse.json({ ...food, id: food.id.toString() });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "食物编码已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: "食物不存在或更新失败" }, { status: 404 });
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
    await prisma.petFoodDef.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "食物不存在" }, { status: 404 });
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

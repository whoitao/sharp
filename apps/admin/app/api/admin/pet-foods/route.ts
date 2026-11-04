import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 宠物食品定义列表 */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "pets");
  if (admin instanceof NextResponse) return admin;

  const foods = await prisma.petFoodDef.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  return NextResponse.json(foods.map((food) => ({ ...food, id: food.id.toString() })));
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "pets");
  if (admin instanceof NextResponse) return admin;

  const body = await request.json().catch(() => null);
  const foodType = String(body?.foodType ?? "").trim();
  const name = String(body?.name ?? "").trim();

  if (!foodType) return NextResponse.json({ error: "食物编码不能为空" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "食物名称不能为空" }, { status: 400 });

  const exists = await prisma.petFoodDef.findUnique({ where: { foodType } });
  if (exists) return NextResponse.json({ error: "食物编码已存在" }, { status: 409 });

  const food = await prisma.petFoodDef.create({
    data: {
      foodType,
      name,
      icon: body?.icon ? String(body.icon).trim() : null,
      satietyGain: Math.max(0, Number(body?.satietyGain ?? 10) || 0),
      expGain: Math.max(0, Number(body?.expGain ?? 0) || 0),
      dailyCap: Math.max(0, Number(body?.dailyCap ?? 30) || 0),
      bankDailyCap:
        body?.bankDailyCap === null || body?.bankDailyCap === undefined || body?.bankDailyCap === ""
          ? null
          : Math.max(0, Number(body.bankDailyCap) || 0),
      obtainRule: body?.obtainRule ? String(body.obtainRule).trim() : null,
      sortOrder: Number(body?.sortOrder ?? 0) || 0,
      enabled: body?.enabled !== false,
    },
  });

  return NextResponse.json({ ...food, id: food.id.toString() }, { status: 201 });
}

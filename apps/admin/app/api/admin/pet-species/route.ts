import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 宠物种类列表：附带阶段数与已领养宠物数 */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "pets");
  if (admin instanceof NextResponse) return admin;

  const species = await prisma.petSpecies.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      stages: { orderBy: [{ sortOrder: "asc" }, { minLevel: "asc" }] },
      _count: { select: { pets: true } },
    },
  });

  return NextResponse.json(
    species.map((s) => ({
      ...s,
      id: s.id.toString(),
      stages: s.stages.map((stage) => ({ ...stage, speciesId: stage.speciesId.toString() })),
      petCount: s._count.pets,
      _count: undefined,
    })),
  );
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "pets");
  if (admin instanceof NextResponse) return admin;

  const body = await request.json().catch(() => null);
  const code = String(body?.code ?? "").trim();
  const name = String(body?.name ?? "").trim();

  if (!code) return NextResponse.json({ error: "种类编码不能为空" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "种类名称不能为空" }, { status: 400 });

  const exists = await prisma.petSpecies.findUnique({ where: { code } });
  if (exists) return NextResponse.json({ error: "种类编码已存在" }, { status: 409 });

  const species = await prisma.petSpecies.create({
    data: {
      code,
      name,
      theme: body?.theme ? String(body.theme).trim() : null,
      icon: body?.icon ? String(body.icon).trim() : null,
      tagline: body?.tagline ? String(body.tagline).trim() : null,
      sortOrder: Number(body?.sortOrder ?? 0) || 0,
      enabled: body?.enabled !== false,
    },
  });

  return NextResponse.json(
    { ...species, id: species.id.toString() },
    { status: 201 },
  );
}

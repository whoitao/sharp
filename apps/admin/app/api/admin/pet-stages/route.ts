import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 宠物阶段列表：可按 speciesId 过滤 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const speciesId = url.searchParams.get("speciesId");

  const stages = await prisma.petSpeciesStage.findMany({
    where: speciesId ? { speciesId: BigInt(speciesId) } : undefined,
    orderBy: [{ speciesId: "asc" }, { sortOrder: "asc" }, { minLevel: "asc" }],
    include: { species: { select: { name: true, code: true } } },
  });

  return NextResponse.json(
    stages.map((stage) => ({
      ...stage,
      id: stage.id,
      speciesId: stage.speciesId.toString(),
      speciesName: stage.species.name,
      speciesCode: stage.species.code,
      species: undefined,
    })),
  );
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json().catch(() => null);
  const speciesId = body?.speciesId;
  const stageKey = String(body?.stageKey ?? "").trim();
  const name = String(body?.name ?? "").trim();

  if (!speciesId) return NextResponse.json({ error: "请选择宠物种类" }, { status: 400 });
  if (!stageKey) return NextResponse.json({ error: "阶段编码不能为空" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "阶段名称不能为空" }, { status: 400 });

  const minLevel = Number(body?.minLevel ?? 1) || 1;
  const maxLevel = Number(body?.maxLevel ?? minLevel) || minLevel;
  if (maxLevel < minLevel) {
    return NextResponse.json({ error: "结束等级不能小于起始等级" }, { status: 400 });
  }

  try {
    const stage = await prisma.petSpeciesStage.create({
      data: {
        speciesId: BigInt(speciesId),
        stageKey,
        name,
        minLevel,
        maxLevel,
        imageUrl: body?.imageUrl ? String(body.imageUrl).trim() : null,
        idleLottieUrl: body?.idleLottieUrl ? String(body.idleLottieUrl).trim() : null,
        feedLottieUrl: body?.feedLottieUrl ? String(body.feedLottieUrl).trim() : null,
        evolveLottieUrl: body?.evolveLottieUrl ? String(body.evolveLottieUrl).trim() : null,
        sortOrder: Number(body?.sortOrder ?? 0) || 0,
      },
    });
    return NextResponse.json(
      { ...stage, speciesId: stage.speciesId.toString() },
      { status: 201 },
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "该种类下阶段编码已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: "创建阶段失败" }, { status: 400 });
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

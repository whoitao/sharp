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
  if (body?.speciesId !== undefined) data.speciesId = BigInt(body.speciesId);
  if (body?.stageKey !== undefined) {
    const stageKey = String(body.stageKey).trim();
    if (!stageKey) return NextResponse.json({ error: "阶段编码不能为空" }, { status: 400 });
    data.stageKey = stageKey;
  }
  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "阶段名称不能为空" }, { status: 400 });
    data.name = name;
  }
  if (body?.minLevel !== undefined) data.minLevel = Number(body.minLevel) || 1;
  if (body?.maxLevel !== undefined) data.maxLevel = Number(body.maxLevel) || 1;
  if (body?.imageUrl !== undefined) data.imageUrl = body.imageUrl ? String(body.imageUrl).trim() : null;
  if (body?.idleLottieUrl !== undefined) data.idleLottieUrl = body.idleLottieUrl ? String(body.idleLottieUrl).trim() : null;
  if (body?.feedLottieUrl !== undefined) data.feedLottieUrl = body.feedLottieUrl ? String(body.feedLottieUrl).trim() : null;
  if (body?.evolveLottieUrl !== undefined) data.evolveLottieUrl = body.evolveLottieUrl ? String(body.evolveLottieUrl).trim() : null;
  if (body?.sideImageUrl !== undefined) data.sideImageUrl = body.sideImageUrl ? String(body.sideImageUrl).trim() : null;
  if (body?.motionManifestUrl !== undefined) data.motionManifestUrl = body.motionManifestUrl ? String(body.motionManifestUrl).trim() : null;
  if (body?.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;

  try {
    const stage = await prisma.petSpeciesStage.update({ where: { id }, data });
    return NextResponse.json({ ...stage, speciesId: stage.speciesId.toString() });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "该种类下阶段编码已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: "阶段不存在或更新失败" }, { status: 404 });
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
    await prisma.petSpeciesStage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "阶段不存在" }, { status: 404 });
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const data: Record<string, unknown> = {};
  if (body?.nickname !== undefined) {
    const nickname = String(body.nickname).trim();
    if (!nickname) return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
    data.nickname = nickname;
  }
  if (body?.schoolStageName !== undefined) {
    data.schoolStageName = body.schoolStageName ? String(body.schoolStageName).trim() : null;
  }
  if (body?.satiety !== undefined) {
    const satiety = Math.min(100, Math.max(0, Number(body.satiety) || 0));
    data.satiety = satiety;
  }
  if (body?.experience !== undefined) {
    const experience = Math.max(0, Number(body.experience) || 0);
    data.experience = experience;
    // 未显式指定等级时按配置推导，避免经验与等级不一致
    if (body?.level === undefined) {
      const config = await prisma.petConfig.findUnique({ where: { id: "default" } });
      const expPerLevel = config?.expPerLevel ?? 100;
      const maxLevel = config?.maxLevel ?? 30;
      data.level = Math.min(maxLevel, Math.floor(experience / expPerLevel) + 1);
    }
  }
  if (body?.level !== undefined) {
    data.level = Math.max(1, Number(body.level) || 1);
  }

  try {
    const pet = await prisma.pet.update({ where: { id }, data });
    return NextResponse.json({
      ...pet,
      speciesId: pet.speciesId.toString(),
    });
  } catch {
    return NextResponse.json({ error: "宠物不存在或更新失败" }, { status: 404 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;

  try {
    // 级联删除 UserPet / PetFoodGrant / PetFeedLog
    await prisma.pet.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "宠物不存在" }, { status: 404 });
  }
}

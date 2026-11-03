import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/** 喂养记录：按用户名 / 宠物昵称搜索，可按食物类型筛选 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20)));
  const keyword = url.searchParams.get("keyword")?.trim();
  const foodType = url.searchParams.get("foodType");

  const where: Prisma.PetFeedLogWhereInput = {};
  if (foodType) where.foodType = foodType;
  if (keyword) {
    where.OR = [
      { pet: { nickname: { contains: keyword, mode: "insensitive" } } },
      { user: { username: { contains: keyword, mode: "insensitive" } } },
      { user: { nickname: { contains: keyword, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.petFeedLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { username: true, nickname: true } },
        pet: { select: { nickname: true, species: { select: { name: true } } } },
      },
    }),
    prisma.petFeedLog.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((log) => ({
      id: log.id,
      userId: log.userId,
      username: log.user.username,
      userNickname: log.user.nickname,
      petId: log.petId,
      petNickname: log.pet.nickname,
      speciesName: log.pet.species.name,
      foodType: log.foodType,
      quantity: log.quantity,
      satietyGain: log.satietyGain,
      expGain: log.expGain,
      levelBefore: log.levelBefore,
      levelAfter: log.levelAfter,
      stageBefore: log.stageBefore,
      stageAfter: log.stageAfter,
      createdAt: log.createdAt,
    })),
    total,
  });
}

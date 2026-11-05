import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parsePageParams } from "@/lib/query";
import { NextRequest, NextResponse } from "next/server";

/** 宠物列表：按昵称 / 用户名 / 用户昵称搜索，可按种类筛选 */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "pets");
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const { page, pageSize } = parsePageParams(url.searchParams, { defaultPageSize: 20 });
  const keyword = url.searchParams.get("keyword")?.trim();
  const speciesId = url.searchParams.get("speciesId");

  const where: Prisma.PetWhereInput = {};
  if (speciesId) where.speciesId = BigInt(speciesId);
  if (keyword) {
    where.OR = [
      { nickname: { contains: keyword, mode: "insensitive" } },
      { userPets: { some: { user: { username: { contains: keyword, mode: "insensitive" } } } } },
      { userPets: { some: { user: { nickname: { contains: keyword, mode: "insensitive" } } } } },
    ];
  }

  const [items, total, config] = await Promise.all([
    prisma.pet.findMany({
      where,
      orderBy: { adoptedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        species: { select: { id: true, name: true, code: true } },
        userPets: {
          orderBy: { isPrimary: "desc" },
          include: { user: { select: { id: true, username: true, nickname: true } } },
        },
      },
    }),
    prisma.pet.count({ where }),
    prisma.petConfig.findUnique({ where: { id: "default" }, select: { satietyMax: true } }),
  ]);
  const satietyMax = config?.satietyMax ?? 200;

  return NextResponse.json({
    items: items.map((pet) => {
      const owner = pet.userPets[0]?.user ?? null;
      return {
        id: pet.id,
        nickname: pet.nickname,
        speciesId: pet.speciesId.toString(),
        speciesName: pet.species.name,
        speciesCode: pet.species.code,
        schoolStageName: pet.schoolStageName,
        level: pet.level,
        experience: pet.experience,
        satiety: pet.satiety,
        satietyMax,
        adoptedAt: pet.adoptedAt,
        lastFedAt: pet.lastFedAt,
        ownerUserId: owner?.id ?? null,
        ownerUsername: owner?.username ?? null,
        ownerNickname: owner?.nickname ?? null,
      };
    }),
    total,
  });
}

import { requireAppUser } from "@/lib/middleware";
import { getPetConfig, levelOf } from "@/lib/pet";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const NICKNAME_MAX = 8;

/** 领养登记：P0 每人一只，事务内创建 Pet 与 UserPet(isPrimary = true) */
export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  let body: { speciesId?: unknown; nickname?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";
  if (!nickname || nickname.length > NICKNAME_MAX) {
    return NextResponse.json({ error: "INVALID_NICKNAME" }, { status: 400 });
  }

  const speciesIdRaw = body?.speciesId;
  if (speciesIdRaw === undefined || speciesIdRaw === null) {
    return NextResponse.json({ error: "SPECIES_NOT_FOUND" }, { status: 400 });
  }
  let speciesId: bigint;
  try {
    speciesId = BigInt(String(speciesIdRaw));
  } catch {
    return NextResponse.json({ error: "SPECIES_NOT_FOUND" }, { status: 400 });
  }

  const species = await prisma.petSpecies.findFirst({ where: { id: speciesId, enabled: true } });
  if (!species) {
    return NextResponse.json({ error: "SPECIES_NOT_FOUND" }, { status: 400 });
  }

  const existing = await prisma.userPet.findFirst({
    where: { userId: appUser.id, isPrimary: true },
    select: { petId: true },
  });
  if (existing) {
    return NextResponse.json({ error: "PET_ALREADY_ADOPTED" }, { status: 409 });
  }

  const config = await getPetConfig();

  const pet = await prisma.$transaction(async (tx) => {
    const created = await tx.pet.create({
      data: {
        speciesId,
        nickname,
        level: 1,
        experience: 0,
        satiety: Math.min(60, config.satietyMax),
      },
    });
    await tx.userPet.create({ data: { userId: appUser.id, petId: created.id, isPrimary: true } });
    return created;
  });

  return NextResponse.json(
    {
      pet: {
        id: pet.id,
        nickname: pet.nickname,
        speciesId: pet.speciesId.toString(),
        level: levelOf(pet.experience, config),
        experience: pet.experience,
        satiety: pet.satiety,
      },
    },
    { status: 201 },
  );
}

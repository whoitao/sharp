import { requireAppUser } from "@/lib/middleware";
import {
  applySatietyDecay,
  getBackpack,
  getPetConfig,
  getPrimaryPet,
  levelOf,
  stageOf,
  todayKey,
} from "@/lib/pet";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const MAX_QUANTITY = 10;

/** 喂食：食物 → 饱腹度 + 经验，一次一条喂养记录 */
export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  let body: { foodType?: unknown; quantity?: unknown } | null = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const foodType = typeof body?.foodType === "string" ? body.foodType : "";
  const quantity = typeof body?.quantity === "number" ? Math.floor(body.quantity) : NaN;
  if (!foodType) {
    return NextResponse.json({ error: "INVALID_FOOD_TYPE" }, { status: 400 });
  }
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return NextResponse.json({ error: "INVALID_QUANTITY" }, { status: 400 });
  }

  const [def, link, config] = await Promise.all([
    prisma.petFoodDef.findFirst({ where: { foodType, enabled: true } }),
    getPrimaryPet(appUser.id),
    getPetConfig(),
  ]);

  if (!def) {
    return NextResponse.json({ error: "INVALID_FOOD_TYPE" }, { status: 400 });
  }
  if (!link) {
    return NextResponse.json({ error: "PET_NOT_ADOPTED" }, { status: 409 });
  }

  const pet = await applySatietyDecay(appUser.id, link.pet, config);
  if (pet.satiety >= config.satietyMax) {
    return NextResponse.json({ error: "PET_FULL", message: "宠物吃饱了，明天再来喂吧" }, { status: 409 });
  }

  const item = await prisma.petFoodItem.findUnique({
    where: { userId_foodType: { userId: appUser.id, foodType } },
  });
  if (!item || item.quantity < quantity) {
    return NextResponse.json({ error: "FOOD_NOT_ENOUGH" }, { status: 409 });
  }

  const today = todayKey();
  const stat = await prisma.petDailyStat.findUnique({
    where: { userId_dateKey: { userId: appUser.id, dateKey: today } },
  });

  const satietyRaw = quantity * def.satietyGain;
  const satietyGain = Math.min(satietyRaw, config.satietyMax - pet.satiety);
  const expRaw = quantity * def.expGain;
  const expGain = Math.min(expRaw, Math.max(0, config.dailyExpCap - (stat?.expGained ?? 0)));

  const levelBefore = levelOf(pet.experience, config);
  const stageBefore = stageOf(levelBefore, link.pet.species.stages)?.stageKey ?? "juvenile";
  const experience = pet.experience + expGain;
  const levelAfter = levelOf(experience, config);
  const stageAfter = stageOf(levelAfter, link.pet.species.stages);
  const stageUp = (stageAfter?.stageKey ?? "juvenile") !== stageBefore;

  await prisma.$transaction(async (tx) => {
    await tx.petFoodItem.update({
      where: { userId_foodType: { userId: appUser.id, foodType } },
      data: { quantity: { decrement: quantity } },
    });
    await tx.pet.update({
      where: { id: pet.id },
      data: {
        satiety: pet.satiety + satietyGain,
        experience,
        level: levelAfter,
        lastFedAt: new Date(),
      },
    });
    await tx.petFeedLog.create({
      data: {
        userId: appUser.id,
        petId: pet.id,
        foodType,
        quantity,
        satietyGain,
        expGain,
        levelBefore,
        levelAfter,
        stageBefore,
        stageAfter: stageAfter?.stageKey ?? "juvenile",
        dateKey: today,
      },
    });
    await tx.petDailyStat.upsert({
      where: { userId_dateKey: { userId: appUser.id, dateKey: today } },
      update: {
        expGained: { increment: expGain },
        feedCount: { increment: 1 },
        satietyGained: { increment: satietyGain },
      },
      create: {
        userId: appUser.id,
        dateKey: today,
        expGained: expGain,
        feedCount: 1,
        satietyGained: satietyGain,
      },
    });
  });

  return NextResponse.json({
    foodType,
    quantity,
    satietyGain,
    expGain,
    satiety: pet.satiety + satietyGain,
    experience,
    level: levelAfter,
    levelUp: levelAfter > levelBefore,
    stageUp,
    evolution:
      stageUp && stageAfter
        ? { stageKey: stageAfter.stageKey, name: stageAfter.name, imageUrl: stageAfter.imageUrl }
        : null,
    backpack: await getBackpack(appUser.id),
    today: { expGained: (stat?.expGained ?? 0) + expGain, expCap: config.dailyExpCap },
    capped: { satiety: satietyRaw > satietyGain, exp: expRaw > expGain },
  });
}

import type { Pet, PetConfig, PetSpecies, PetSpeciesStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** 服务器本地日期键：与现有 UserDailyStat 完全一致，不使用客户端时间 */
export function todayKey(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** @db.Date 字段读回来是 UTC 零点，统一换算成本地零点再比较 */
function localMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** 喂养记录展示用：MM-DD HH:mm（本地时区） */
export function formatFeedTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function getPetConfig(): Promise<PetConfig> {
  return prisma.petConfig.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
}

/** 等级 = floor(经验 / 每级经验) + 1，封顶 maxLevel */
export function levelOf(experience: number, config: PetConfig): number {
  if (config.expPerLevel <= 0) return 1;
  return Math.min(Math.max(1, Math.floor(experience / config.expPerLevel) + 1), config.maxLevel);
}

/** 升到下一级所需的累计经验；满级返回当前经验（进度条展示满格） */
export function expToNextLevel(level: number, experience: number, config: PetConfig): number {
  if (level >= config.maxLevel) return experience;
  return level * config.expPerLevel;
}

/** 阶段由等级推导，不落库；阶段表按 sortOrder 升序 */
export function stageOf(level: number, stages: PetSpeciesStage[]): PetSpeciesStage | null {
  if (stages.length === 0) return null;
  return (
    stages.find((s) => level >= s.minLevel && level <= s.maxLevel) ??
    (level > stages[stages.length - 1].maxLevel ? stages[stages.length - 1] : stages[0])
  );
}

/** 状态实时计算：优先级 asleep > hungry > normal > active */
export function stateOf(satiety: number, lastFedAt: Date | null, now: Date = new Date()): string {
  if (satiety >= 70) return "active";
  const fedWithinTwoDays =
    lastFedAt !== null && now.getTime() - lastFedAt.getTime() <= 2 * 24 * 3600 * 1000;
  if (satiety < 30) return fedWithinTwoDays ? "hungry" : "asleep";
  return "normal";
}

/**
 * 饱腹度衰减：从 lastDecayDate 次日起逐日检查，当日喂食次数为 0 则扣一次。
 * 最多回溯 7 天，避免长期不登录时循环过久。
 */
export async function applySatietyDecay(userId: string, pet: Pet, config: PetConfig): Promise<Pet> {
  const today = todayKey();
  const last = localMidnight(pet.lastDecayDate);
  if (last.getTime() >= today.getTime()) return pet;

  const days: Date[] = [];
  const cursor = new Date(last);
  while (days.length < 7) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getTime() >= today.getTime()) break;
    days.push(localMidnight(cursor));
  }

  if (days.length === 0) {
    return prisma.pet.update({ where: { id: pet.id }, data: { lastDecayDate: today } });
  }

  const stats = await prisma.petDailyStat.findMany({
    where: { userId, dateKey: { in: days } },
    select: { dateKey: true, feedCount: true },
  });
  const fedDays = new Set(
    stats.filter((s) => s.feedCount > 0).map((s) => localMidnight(s.dateKey).getTime()),
  );

  const lost = days.filter((d) => !fedDays.has(d.getTime())).length * config.satietyDecay;
  const satiety = Math.max(0, pet.satiety - lost);

  return prisma.pet.update({
    where: { id: pet.id },
    data: { satiety, lastDecayDate: today },
  });
}

/** 当前用户的主宠物（P0 每人一只） */
export async function getPrimaryPet(userId: string) {
  return prisma.userPet.findFirst({
    where: { userId, isPrimary: true },
    include: {
      pet: {
        include: {
          species: { include: { stages: { orderBy: { sortOrder: "asc" } } } },
        },
      },
    },
  });
}

export type PetSpeciesWithStages = PetSpecies & { stages: PetSpeciesStage[] };

/** 组装 pet 出参（首页卡片与宠物页共用） */
export function buildPetDetail(
  pet: Pet & { species: PetSpeciesWithStages },
  config: PetConfig,
  backpackQuantity: number,
) {
  const stages = pet.species.stages;
  const level = levelOf(pet.experience, config);
  const stage = stageOf(level, stages);
  const state = stateOf(pet.satiety, pet.lastFedAt);

  return {
    id: pet.id,
    nickname: pet.nickname,
    species: { code: pet.species.code, name: pet.species.name, theme: pet.species.theme, icon: pet.species.icon },
    growthStage: {
      key: stage?.stageKey ?? "juvenile",
      name: stage?.name ?? pet.species.name,
      imageUrl: stage?.imageUrl ?? null,
      idleLottieUrl: stage?.idleLottieUrl ?? null,
      feedLottieUrl: stage?.feedLottieUrl ?? null,
      evolveLottieUrl: stage?.evolveLottieUrl ?? null,
      sideImageUrl: stage?.sideImageUrl ?? null,
      motionManifestUrl: stage?.motionManifestUrl ?? null,
    },
    schoolStageName: pet.schoolStageName,
    level,
    experience: pet.experience,
    expToNext: expToNextLevel(level, pet.experience, config),
    expPerLevel: config.expPerLevel,
    satiety: pet.satiety,
    satietyMax: config.satietyMax,
    state,
    canFeed: pet.satiety < config.satietyMax && backpackQuantity > 0,
    adoptedAt: pet.adoptedAt.toISOString(),
    companionDays: Math.max(1, Math.floor((Date.now() - pet.adoptedAt.getTime()) / (24 * 3600 * 1000)) + 1),
    route: stages.map((s) => ({
      stageKey: s.stageKey,
      name: s.name,
      imageUrl: s.imageUrl,
      level: s.minLevel,
    })),
  };
}

/** 背包：按 foodType 聚合的数量表 */
export async function getBackpack(userId: string): Promise<Record<string, number>> {
  const items = await prisma.petFoodItem.findMany({ where: { userId } });
  const map: Record<string, number> = { normal: 0, premium: 0, rare: 0 };
  for (const item of items) map[item.foodType] = item.quantity;
  return map;
}

/** 背包：三类食物 + 库存数量 + 效果说明（按食物定义排序） */
export async function buildBackpack(userId: string) {
  const [defs, items] = await Promise.all([
    prisma.petFoodDef.findMany({ where: { enabled: true }, orderBy: { sortOrder: "asc" } }),
    prisma.petFoodItem.findMany({ where: { userId } }),
  ]);
  const quantityOf = (type: string) => items.find((i) => i.foodType === type)?.quantity ?? 0;

  return defs.map((d) => ({
    foodType: d.foodType,
    name: d.name,
    icon: d.icon,
    quantity: quantityOf(d.foodType),
    satiety: d.satietyGain,
    exp: d.expGain,
    obtainHint: d.obtainRule,
  }));
}

export interface GrantInput {
  userId: string;
  attemptId: string;
  clientSessionId: string;
  scopeType: string;
  subjectId: bigint | null;
  subjectName: string | null;
  chapterId: bigint | null;
  knowledgePointId: bigint | null;
  scopeName: string | null;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
  maxStreak: number;
}

/**
 * 练习结算发放经验与食物。
 * 未领养返回 null；同一 clientSessionId 重复结算直接返回首次结果（幂等）。
 */
export async function grantPetRewards(input: GrantInput) {
  const link = await getPrimaryPet(input.userId);
  if (!link) return null;

  const pet = link.pet;
  const config = await getPetConfig();
  const today = todayKey();

  const existing = await prisma.petFoodGrant.findUnique({
    where: { userId_clientSessionId: { userId: input.userId, clientSessionId: input.clientSessionId } },
  });

  const [stat, backpack] = await Promise.all([
    prisma.petDailyStat.findUnique({ where: { userId_dateKey: { userId: input.userId, dateKey: today } } }),
    getBackpack(input.userId),
  ]);

  if (existing) {
    return {
      granted: { normal: existing.normalCount, premium: existing.premiumCount, rare: existing.rareCount },
      expGained: existing.expGained,
      todayExp: stat?.expGained ?? existing.expGained,
      expCap: config.dailyExpCap,
      riskBlocked: existing.riskFlag,
      level: levelOf(pet.experience, config),
      levelUp: false,
      stageUp: false,
      evolution: null,
      backpack,
    };
  }

  const defs = await prisma.petFoodDef.findMany();
  const defOf = (type: string) => defs.find((d) => d.foodType === type);

  const avgSeconds = input.totalQuestions > 0 ? input.durationSeconds / input.totalQuestions : 0;
  const riskBlocked =
    input.totalQuestions > config.maxQuestionsPerAttempt ||
    avgSeconds < config.minSecondsPerQuestion;

  const remainingExp = Math.max(0, config.dailyExpCap - (stat?.expGained ?? 0));
  const expRaw = riskBlocked
    ? 0
    : input.correctCount * config.expPerCorrect + Math.min(input.maxStreak, config.streakBonusMax);
  const expGained = Math.min(expRaw, remainingExp);

  // 三类食物：数量先按规则算，再受各自每日上限约束
  const normalDef = defOf("normal");
  const premiumDef = defOf("premium");
  const rareDef = defOf("rare");

  const normalRaw = riskBlocked ? 0 : input.correctCount;
  const premiumRaw = riskBlocked ? 0 : input.maxStreak >= config.premiumStreak ? 1 : 0;
  const rareRaw = riskBlocked
    ? 0
    : input.scopeType === "chapter" && input.totalQuestions >= config.rareMinQuestions
      ? 1
      : 0;

  const normalRoom = normalDef ? Math.max(0, normalDef.dailyCap - (stat?.foodNormal ?? 0)) : 0;
  const bankRoom =
    normalDef?.bankDailyCap == null
      ? Number.POSITIVE_INFINITY
      : Math.max(0, normalDef.bankDailyCap - (stat?.bankFoodNormal ?? 0));
  const isBank = input.scopeType === "bank";

  const normalCount = Math.min(normalRaw, normalRoom, isBank ? bankRoom : Number.POSITIVE_INFINITY);
  const premiumCount = Math.min(premiumRaw, premiumDef ? Math.max(0, premiumDef.dailyCap - (stat?.foodPremium ?? 0)) : 0);
  const rareCount = Math.min(rareRaw, rareDef ? Math.max(0, rareDef.dailyCap - (stat?.foodRare ?? 0)) : 0);

  const levelBefore = levelOf(pet.experience, config);
  const stageBefore = stageOf(levelBefore, pet.species.stages)?.stageKey ?? "juvenile";
  const newExperience = pet.experience + expGained;
  const levelAfter = levelOf(newExperience, config);
  const stageAfter = stageOf(levelAfter, pet.species.stages);
  const stageUp = (stageAfter?.stageKey ?? "juvenile") !== stageBefore;

  await prisma.$transaction(async (tx) => {
    await tx.petFoodGrant.create({
      data: {
        userId: input.userId,
        petId: pet.id,
        attemptId: input.attemptId,
        clientSessionId: input.clientSessionId,
        scopeType: input.scopeType,
        subjectId: input.subjectId,
        subjectName: input.subjectName,
        chapterId: input.chapterId,
        knowledgePointId: input.knowledgePointId,
        scopeName: input.scopeName,
        correctCount: input.correctCount,
        totalQuestions: input.totalQuestions,
        maxStreak: input.maxStreak,
        normalCount,
        premiumCount,
        rareCount,
        expGained,
        riskFlag: riskBlocked,
        dateKey: today,
      },
    });

    for (const [type, count] of [
      ["normal", normalCount],
      ["premium", premiumCount],
      ["rare", rareCount],
    ] as const) {
      if (count <= 0) continue;
      await tx.petFoodItem.upsert({
        where: { userId_foodType: { userId: input.userId, foodType: type } },
        update: { quantity: { increment: count } },
        create: { userId: input.userId, foodType: type, quantity: count },
      });
    }

    if (expGained > 0 || levelAfter !== levelBefore) {
      await tx.pet.update({
        where: { id: pet.id },
        data: { experience: newExperience, level: levelAfter },
      });
    }

    await tx.petDailyStat.upsert({
      where: { userId_dateKey: { userId: input.userId, dateKey: today } },
      update: {
        expGained: { increment: expGained },
        foodNormal: { increment: normalCount },
        bankFoodNormal: { increment: isBank ? normalCount : 0 },
        foodPremium: { increment: premiumCount },
        foodRare: { increment: rareCount },
      },
      create: {
        userId: input.userId,
        dateKey: today,
        expGained,
        foodNormal: normalCount,
        bankFoodNormal: isBank ? normalCount : 0,
        foodPremium: premiumCount,
        foodRare: rareCount,
      },
    });
  });

  const updatedBackpack = await getBackpack(input.userId);

  return {
    granted: { normal: normalCount, premium: premiumCount, rare: rareCount },
    expGained,
    todayExp: (stat?.expGained ?? 0) + expGained,
    expCap: config.dailyExpCap,
    riskBlocked,
    level: levelAfter,
    levelUp: levelAfter > levelBefore,
    stageUp,
    evolution:
      stageUp && stageAfter
        ? { stageKey: stageAfter.stageKey, name: stageAfter.name, imageUrl: stageAfter.imageUrl }
        : null,
    backpack: updatedBackpack,
  };
}

import { requireAppUser } from "@/lib/middleware";
import { generatePetHungryNotification } from "@/lib/notification";
import {
  applySatietyDecay,
  buildBackpack,
  buildPetDetail,
  formatFeedTime,
  getBackpack,
  getPetConfig,
  getPrimaryPet,
  todayKey,
} from "@/lib/pet";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 宠物详情 / 首页卡片 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  // 打开宠物页时按当前状态补一条饥饿提醒（08:00–22:00，按宠物 + 日期去重）
  await generatePetHungryNotification(appUser.id);

  const config = await getPetConfig();
  const today = todayKey();

  const [link, stat, backpack, feedCount, correctSum, subjectGroups] = await Promise.all([
    getPrimaryPet(appUser.id),
    prisma.petDailyStat.findUnique({
      where: { userId_dateKey: { userId: appUser.id, dateKey: today } },
    }),
    getBackpack(appUser.id),
    prisma.petFeedLog.count({ where: { userId: appUser.id } }),
    prisma.userQuestionProgress.aggregate({
      where: { userId: appUser.id },
      _sum: { correctCount: true },
    }),
    prisma.petFoodGrant.groupBy({
      by: ["subjectName"],
      where: { userId: appUser.id, subjectName: { not: null } },
      _count: { subjectName: true },
      orderBy: { _count: { subjectName: "desc" } },
      take: 1,
    }),
  ]);

  const todayExp = stat?.expGained ?? 0;
  const todayFeedCount = stat?.feedCount ?? 0;

  const todayInfo = {
    expGained: todayExp,
    expCap: config.dailyExpCap,
    remainingExp: Math.max(0, config.dailyExpCap - todayExp),
    feedCount: todayFeedCount,
  };

  const stats = {
    totalCorrect: correctSum._sum.correctCount ?? 0,
    feedCount,
    favoriteSubject: subjectGroups[0]?.subjectName ?? null,
  };

  if (!link) {
    return NextResponse.json({
      pet: null,
      today: todayInfo,
      backpack: [],
      stats,
      recentFeeds: [],
    });
  }

  const pet = await applySatietyDecay(link.pet, config);
  const backpackQuantity = Object.values(backpack).reduce((sum, n) => sum + n, 0);

  const recentFeeds = await prisma.petFeedLog.findMany({
    where: { userId: appUser.id },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  return NextResponse.json({
    pet: buildPetDetail({ ...link.pet, ...pet }, config, backpackQuantity),
    today: todayInfo,
    backpack: await buildBackpack(appUser.id),
    stats,
    recentFeeds: recentFeeds.map((f) => ({
      id: f.id,
      createdAt: f.createdAt.toISOString(),
      dateLabel: formatFeedTime(f.createdAt),
      foodType: f.foodType,
      quantity: f.quantity,
      satietyGain: f.satietyGain,
      expGain: f.expGain,
      levelUp: f.levelAfter > f.levelBefore,
      stageUp: f.stageAfter !== f.stageBefore,
    })),
  });
}

import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const CONFIG_ID = "default";

/** 读取全局宠物配置，不存在时按默认值创建 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const config = await prisma.petConfig.upsert({
    where: { id: CONFIG_ID },
    update: {},
    create: { id: CONFIG_ID },
  });

  return NextResponse.json({ ...config });
}

export async function PUT(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json().catch(() => null);

  const data: Record<string, unknown> = {};
  const intFields = [
    "expPerCorrect",
    "streakBonusMax",
    "dailyExpCap",
    "dailyLoginExp",
    "satietyMax",
    "satietyDecay",
    "expPerLevel",
    "maxLevel",
    "growingLevel",
    "matureLevel",
    "premiumStreak",
    "rareMinQuestions",
    "minSecondsPerQuestion",
    "maxQuestionsPerAttempt",
  ] as const;

  for (const field of intFields) {
    if (body?.[field] !== undefined) {
      data[field] = Math.max(0, Number(body[field]) || 0);
    }
  }
  data.updatedBy = admin.username;

  const config = await prisma.petConfig.upsert({
    where: { id: CONFIG_ID },
    update: data,
    create: { id: CONFIG_ID, ...data },
  });

  return NextResponse.json({ ...config });
}

import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const CONFIG_ID = "default";

/** 新字段要求严格整数范围，非法值直接拒绝而不是静默截断 */
function parseIntInRange(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

/** 读取全局宠物配置，不存在时按默认值创建 */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "pets");
  if (admin instanceof NextResponse) return admin;

  const config = await prisma.petConfig.upsert({
    where: { id: CONFIG_ID },
    update: {},
    create: { id: CONFIG_ID },
  });

  return NextResponse.json({ ...config });
}

export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "pets");
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
  if (data.satietyMax !== undefined) {
    data.satietyMax = Math.min(200, Number(data.satietyMax));
  }

  // 饥饿提醒参数：阈值 0–100、时段 0–23、喂养窗口 0–30
  const rangedFields = [
    ["hungryThreshold", 0, 100, "饥饿阈值需为 0–100 的整数"],
    ["notifyQuietStart", 0, 23, "推送开始时间需为 0–23 的整数"],
    ["notifyQuietEnd", 0, 23, "推送结束时间需为 0–23 的整数"],
    ["fedWindowDays", 0, 30, "喂养有效窗口需为 0–30 的整数"],
  ] as const;
  for (const [field, min, max, error] of rangedFields) {
    if (body?.[field] === undefined) continue;
    const parsed = parseIntInRange(body[field], min, max);
    if (parsed === null) return NextResponse.json({ error }, { status: 400 });
    data[field] = parsed;
  }

  data.updatedBy = admin.username;

  const config = await prisma.petConfig.upsert({
    where: { id: CONFIG_ID },
    update: data,
    create: { id: CONFIG_ID, ...data },
  });

  return NextResponse.json({ ...config });
}

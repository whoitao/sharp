import { requireAppUser } from "@/lib/middleware";
import { formatFeedTime } from "@/lib/pet";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 喂养记录：按时间倒序分页，仅最近 30 天 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1);
  const pageSize = 20;
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const where = { userId: appUser.id, createdAt: { gte: since } };

  const [total, logs] = await Promise.all([
    prisma.petFeedLog.count({ where }),
    prisma.petFeedLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data: logs.map((f) => ({
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
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

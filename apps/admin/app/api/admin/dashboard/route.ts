import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { withTtlCache } from "@/lib/cache";
import { handleRouteError } from "@/lib/http";
import { NextRequest, NextResponse } from "next/server";

const CACHE_TTL = 30_000;

async function computeDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    todayNewUsers,
    todayActiveUsers,
    totalStudySessions,
    todayStudySessions,
    totalGrades,
    totalQuestions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { createdAt: { gte: today } },
    }),
    prisma.user.count({
      where: {
        dailyStats: {
          some: {
            date: { gte: today },
          },
        },
      },
    }),
    prisma.studyAttempt.count(),
    prisma.studyAttempt.count({
      where: { startedAt: { gte: today } },
    }),
    prisma.grade.count(),
    prisma.question.count(),
  ]);

  return {
    totalUsers,
    todayNewUsers,
    todayActiveUsers,
    totalStudySessions,
    todayStudySessions,
    totalGrades,
    totalQuestions,
  };
}

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "dashboard");
  if (admin instanceof NextResponse) return admin;

  try {
    // 「今日」口径按自然日，缓存 key 带日期，跨天自动失效
    const dateKey = new Date().toISOString().slice(0, 10);
    const data = await withTtlCache(`dashboard:${dateKey}`, CACHE_TTL, computeDashboard);
    return NextResponse.json(data);
  } catch (err) {
    return handleRouteError(err, "admin/dashboard");
  }
}

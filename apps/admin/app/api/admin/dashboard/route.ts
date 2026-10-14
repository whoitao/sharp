import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    todayNewUsers,
    todayActiveUsers,
    totalStudySessions,
    todayStudySessions,
    totalCategories,
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
    prisma.userStudyRecord.count(),
    prisma.userStudyRecord.count({
      where: { startedAt: { gte: today } },
    }),
    prisma.category.count(),
    prisma.question.count(),
  ]);

  return NextResponse.json({
    totalUsers,
    todayNewUsers,
    todayActiveUsers,
    totalStudySessions,
    todayStudySessions,
    totalCategories,
    totalQuestions,
  });
}

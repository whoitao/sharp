import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "dashboard");
  if (admin instanceof NextResponse) return admin;

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

  return NextResponse.json({
    totalUsers,
    todayNewUsers,
    todayActiveUsers,
    totalStudySessions,
    todayStudySessions,
    totalGrades,
    totalQuestions,
  });
}

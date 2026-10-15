import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7");

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const [totalAnswered, totalUnitsCompleted, totalStudyDuration, recentStats, allDailyStats] =
    await Promise.all([
      prisma.userQuestionProgress.count({
        where: {
          userId: appUser.id,
          status: { in: ["correct", "wrong"] },
        },
      }),
      prisma.userStudyRecord.count({
        where: { userId: appUser.id, finishedAt: { not: null } },
      }),
      prisma.userStudyRecord.aggregate({
        where: { userId: appUser.id },
        _sum: { durationSeconds: true },
      }),
      prisma.userDailyStat.findMany({
        where: {
          userId: appUser.id,
          date: { gte: since },
        },
        orderBy: { date: "asc" },
      }),
      prisma.userDailyStat.findMany({
        where: {
          userId: appUser.id,
          questionsAnswered: { gt: 0 },
        },
        orderBy: { date: "desc" },
      }),
    ]);

  const totalCorrect = await prisma.userQuestionProgress.count({
    where: { userId: appUser.id, status: "correct" },
  });

  // Compute total days (distinct dates with activity)
  const totalDays = allDailyStats.length;

  // Compute streak (consecutive days ending today or yesterday)
  let streak = 0;
  if (allDailyStats.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastActiveDate = new Date(allDailyStats[0].date);
    lastActiveDate.setHours(0, 0, 0, 0);

    // Streak must include today or yesterday to be current
    const isRecent =
      lastActiveDate.getTime() === today.getTime() ||
      lastActiveDate.getTime() === yesterday.getTime();

    if (isRecent) {
      streak = 1;
      let checkDate = new Date(lastActiveDate);
      for (let i = 1; i < allDailyStats.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const statDate = new Date(allDailyStats[i].date);
        statDate.setHours(0, 0, 0, 0);
        if (statDate.getTime() === checkDate.getTime()) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  return NextResponse.json({
    totalDays,
    totalQuestions: totalAnswered,
    streak,
    totalCorrect,
    totalUnitsCompleted,
    totalStudyDuration: totalStudyDuration._sum.durationSeconds || 0,
    accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
    recentStats: recentStats.map((s: any) => ({
      date: s.date,
      questionsAnswered: s.questionsAnswered,
      unitsCompleted: s.unitsCompleted,
      studyDuration: s.studyDuration,
    })),
  });
}

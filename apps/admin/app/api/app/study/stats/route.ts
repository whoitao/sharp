import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/middleware";
import {
  beijingDateStr,
  beijingDayRange,
  beijingWeekStartStr,
  shiftDateStr,
} from "@/lib/datetime";

/**
 * 学习统计总览。
 * 兼容层：`days` + `recentStats` + 原有累计字段保持不变，apps/web 仍按老结构消费。
 * 新增层：`range` 口径聚合、`dailySeries` 近 14 个北京日序列（缺日补零）、
 * `longestStreak` / `lastActiveDate`，供移动端学习记录页的口径分段与热力条使用。
 */

const RANGE_KEYS = ["today", "week", "month", "all"] as const;
type RangeKey = (typeof RANGE_KEYS)[number];

/** 热力条固定展示的天数：够回答「哪天学的、哪天断了」，又不用按月取数 */
const SERIES_DAYS = 14;

function parseRange(raw: string | null): RangeKey {
  return (RANGE_KEYS as readonly string[]).includes(raw ?? "")
    ? (raw as RangeKey)
    : "all";
}

/** 口径起点日（含）。全部口径无起点 */
function rangeStartStr(key: RangeKey, todayStr: string): string | null {
  if (key === "today") return todayStr;
  if (key === "week") return beijingWeekStartStr(todayStr);
  if (key === "month") return `${todayStr.slice(0, 7)}-01`;
  return null;
}

interface DayPoint {
  questionsAnswered: number;
  sessionsCompleted: number;
  studyDuration: number;
}

export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { searchParams } = new URL(request.url);
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") || "7")));
  const range = parseRange(searchParams.get("range"));

  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const [totalAnswered, totalSessions, totalStudyDuration, allDailyStats, recentStats] =
    await Promise.all([
      prisma.userQuestionProgress.count({
        where: {
          userId: appUser.id,
          status: { in: ["correct", "wrong"] },
        },
      }),
      prisma.studyAttempt.count({
        where: { userId: appUser.id },
      }),
      prisma.studyAttempt.aggregate({
        where: { userId: appUser.id },
        _sum: { durationSeconds: true },
      }),
      // 日键已是北京时间零点，取全量活跃日即可推出连续、最长与任意口径
      prisma.userDailyStat.findMany({
        where: {
          userId: appUser.id,
          questionsAnswered: { gt: 0 },
        },
        orderBy: { date: "desc" },
      }),
      prisma.userDailyStat.findMany({
        where: {
          userId: appUser.id,
          date: { gte: since },
        },
        orderBy: { date: "asc" },
      }),
    ]);

  const totalCorrect = await prisma.userQuestionProgress.count({
    where: { userId: appUser.id, status: "correct" },
  });

  const todayStr = beijingDateStr(new Date())!;
  const byDay = new Map<string, DayPoint>();
  for (const stat of allDailyStats) {
    const key = beijingDateStr(stat.date);
    if (!key) continue;
    byDay.set(key, {
      questionsAnswered: stat.questionsAnswered,
      sessionsCompleted: stat.sessionsCompleted,
      studyDuration: stat.studyDuration,
    });
  }

  const totalDays = byDay.size;
  const lastActiveDate =
    allDailyStats.length > 0 ? beijingDateStr(allDailyStats[0].date) : null;

  // 连续天数：必须落在今天或昨天，否则当前连续为 0（与旧口径一致）
  let streak = 0;
  let lastActiveDateObj: Date | null = null;
  if (allDailyStats.length > 0) {
    lastActiveDateObj = new Date(allDailyStats[0].date);
    lastActiveDateObj.setUTCHours(0, 0, 0, 0);
    const lastStr = beijingDateStr(lastActiveDateObj)!;
    const isRecent = lastStr === todayStr || lastStr === shiftDateStr(todayStr, -1);
    if (isRecent) {
      let cursor = lastStr;
      while (byDay.has(cursor)) {
        streak++;
        cursor = shiftDateStr(cursor, -1);
      }
    }
  }

  // 历史最长连续：按日升序扫描，相邻日键差一天即延续
  const sortedAsc = [...byDay.keys()].sort();
  let longestStreak = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sortedAsc) {
    run = previous && shiftDateStr(previous, 1) === day ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = day;
  }

  // 近 14 天序列：缺日补零，前端热力条直接按下标渲染
  const dailySeries = Array.from({ length: SERIES_DAYS }, (_, index) => {
    const date = shiftDateStr(todayStr, index - (SERIES_DAYS - 1));
    const point = byDay.get(date);
    return {
      date,
      questionsAnswered: point?.questionsAnswered ?? 0,
      sessionsCompleted: point?.sessionsCompleted ?? 0,
      studyDuration: point?.studyDuration ?? 0,
    };
  });

  // 口径聚合：题量/次数/时长走 UserDailyStat（与热力条同源），
  // 正确率走 StudyAttempt（UserDailyStat 不存对错数）。
  // 注意：这里统计的是「作答次数」，与 legacy totalQuestions（去重题数）口径不同，
  // 四个 range 之间必须可比，所以全部口径也按日求和，不复用 legacy 总量。
  const startStr = rangeStartStr(range, todayStr);
  const rangeStats = {
    questionsAnswered: 0,
    sessionsCompleted: 0,
    studyDuration: 0,
    activeDays: 0,
    accuracy: 0,
  };

  for (const [date, point] of byDay) {
    if (startStr && (date < startStr || date > todayStr)) continue;
    rangeStats.questionsAnswered += point.questionsAnswered;
    rangeStats.sessionsCompleted += point.sessionsCompleted;
    rangeStats.studyDuration += point.studyDuration;
    rangeStats.activeDays++;
  }

  const rangeStart = startStr ? beijingDayRange(startStr)?.start : undefined;
  const graded = await prisma.studyAttempt.aggregate({
    where: {
      userId: appUser.id,
      ...(rangeStart ? { finishedAt: { gte: rangeStart } } : {}),
    },
    _sum: { correctCount: true, totalQuestions: true },
  });
  const gradedTotal = graded._sum.totalQuestions ?? 0;
  rangeStats.accuracy =
    gradedTotal > 0 ? Math.round(((graded._sum.correctCount ?? 0) / gradedTotal) * 100) : 0;

  return NextResponse.json({
    totalDays,
    totalQuestions: totalAnswered,
    streak,
    totalCorrect,
    totalSessions,
    totalStudyDuration: totalStudyDuration._sum.durationSeconds || 0,
    accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
    recentStats: recentStats.map((stat) => ({
      date: stat.date,
      questionsAnswered: stat.questionsAnswered,
      sessionsCompleted: stat.sessionsCompleted,
      studyDuration: stat.studyDuration,
    })),
    range,
    longestStreak,
    lastActiveDate,
    rangeStats,
    dailySeries,
  });
}

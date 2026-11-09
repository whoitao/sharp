import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/middleware";
import { avatarPublicUrl } from "@/lib/storage";

type Period = "week" | "month" | "all";

function parsePeriod(raw: string | null): Period {
  if (raw === "week" || raw === "month") return raw;
  return "all";
}

function sinceDate(period: Period): Date | null {
  if (period === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - (period === "week" ? 7 : 30));
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") === "pet" ? "pet" : "quiz";
  const period = parsePeriod(searchParams.get("period"));

  if (type === "pet") {
    return getPetLeaderboard(appUser.id);
  }
  return getQuizLeaderboard(appUser.id, period);
}

async function getQuizLeaderboard(
  userId: string,
  period: Period,
): Promise<NextResponse> {
  const since = sinceDate(period);

  // Aggregate questionsAnswered per user from UserDailyStat
  const where = since ? { date: { gte: since } } : {};
  const stats = await prisma.userDailyStat.groupBy({
    by: ["userId"],
    where,
    _sum: { questionsAnswered: true },
    having: { questionsAnswered: { _sum: { gt: 0 } } },
    orderBy: { _sum: { questionsAnswered: "desc" } },
    take: 100,
  });

  if (stats.length === 0) {
    return NextResponse.json({ entries: [], currentUser: null, nextRankGap: null });
  }

  const userIds = stats.map((s) => s.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, nickname: true, avatar: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Build entries with rank
  const entries = stats.map((s, i) => {
    const u = userMap.get(s.userId);
    return {
      rank: i + 1,
      userId: s.userId,
      nickname: u?.nickname ?? null,
      avatar: u?.avatar ? avatarPublicUrl(u.avatar) : null,
      totalQuestions: s._sum.questionsAnswered ?? 0,
      accuracy: 0,
      gradeName: null,
    };
  });

  // Find current user's rank
  const currentUserStat = stats.find((s) => s.userId === userId);
  let currentUser = null;
  let nextRankGap = null;

  if (currentUserStat) {
    const u = userMap.get(userId);
    const rank = stats.findIndex((s) => s.userId === userId) + 1;
    currentUser = {
      rank,
      userId,
      nickname: u?.nickname ?? null,
      avatar: u?.avatar ? avatarPublicUrl(u.avatar) : null,
      totalQuestions: currentUserStat._sum.questionsAnswered ?? 0,
      accuracy: 0,
      gradeName: null,
    };

    // Gap to next rank (the person just above)
    if (rank > 1) {
      const above = stats[rank - 2];
      nextRankGap = (above._sum.questionsAnswered ?? 0) - (currentUserStat._sum.questionsAnswered ?? 0);
    }
  }

  return NextResponse.json({ entries, currentUser, nextRankGap });
}

async function getPetLeaderboard(userId: string): Promise<NextResponse> {
  // Get all UserPet records with their Pet and Species, ordered by experience desc
  const userPets = await prisma.userPet.findMany({
    where: { isPrimary: true },
    include: {
      pet: {
        include: {
          species: { select: { name: true, icon: true } },
        },
      },
      user: { select: { id: true, nickname: true, avatar: true } },
    },
    orderBy: { pet: { experience: "desc" } },
    take: 100,
  });

  if (userPets.length === 0) {
    return NextResponse.json({ entries: [], currentUser: null, nextRankGap: null });
  }

  const entries = userPets.map((up, i) => ({
    rank: i + 1,
    userId: up.user.id,
    nickname: up.user.nickname ?? null,
    avatar: up.user.avatar ? avatarPublicUrl(up.user.avatar) : null,
    petName: up.pet.nickname,
    petSpecies: up.pet.species.icon ?? up.pet.species.name,
    petLevel: up.pet.level,
    petExp: up.pet.experience,
  }));

  // Find current user
  const currentIdx = userPets.findIndex((up) => up.user.id === userId);
  let currentUser = null;
  let nextRankGap = null;

  if (currentIdx >= 0) {
    const up = userPets[currentIdx];
    currentUser = {
      rank: currentIdx + 1,
      userId: up.user.id,
      nickname: up.user.nickname ?? null,
      avatar: up.user.avatar ? avatarPublicUrl(up.user.avatar) : null,
      petName: up.pet.nickname,
      petSpecies: up.pet.species.icon ?? up.pet.species.name,
      petLevel: up.pet.level,
      petExp: up.pet.experience,
    };

    if (currentIdx > 0) {
      const above = userPets[currentIdx - 1];
      nextRankGap = above.pet.experience - up.pet.experience;
    }
  }

  return NextResponse.json({ entries, currentUser, nextRankGap });
}

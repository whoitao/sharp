import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

  const where = { userId: appUser.id };

  const [total, records] = await Promise.all([
    prisma.userStudyRecord.count({ where }),
    prisma.userStudyRecord.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const serialized = records.map((r) => ({
    id: r.id,
    userId: r.userId,
    categoryId: r.categoryId.toString(),
    unitIndex: r.unitIndex,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    totalQuestions: r.totalQuestions,
    correctCount: r.correctCount,
    wrongCount: r.wrongCount,
    durationSeconds: r.durationSeconds,
  }));

  return NextResponse.json({
    data: serialized,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

  // 可选筛选：分类 / 科目 / 知识点（记录上的筛选字段，null 记录只在不传对应参数时命中）
  const categoryId = searchParams.get("categoryId");
  const subjectId = searchParams.get("subjectId");
  const knowledgePointId = searchParams.get("knowledgePointId");

  const where: Record<string, unknown> = { userId: appUser.id };
  if (categoryId) where.categoryId = BigInt(categoryId);
  if (subjectId) where.subjectId = BigInt(subjectId);
  if (knowledgePointId) where.knowledgePointId = BigInt(knowledgePointId);

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
    subjectId: r.subjectId?.toString() ?? null,
    knowledgePointId: r.knowledgePointId?.toString() ?? null,
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

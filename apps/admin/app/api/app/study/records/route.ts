import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

  // 可选筛选：分类 / 年级 / 科目 / 知识点 / 教材章节（记录上的筛选字段，null 记录只在不传对应参数时命中）
  const categoryId = searchParams.get("categoryId");
  const gradeId = searchParams.get("gradeId");
  const subjectId = searchParams.get("subjectId");
  const knowledgePointId = searchParams.get("knowledgePointId");
  const chapterId = searchParams.get("chapterId");

  const where: Record<string, unknown> = { userId: appUser.id };
  if (categoryId) where.categoryId = BigInt(categoryId);
  if (gradeId) where.gradeId = BigInt(gradeId);
  if (subjectId) where.subjectId = BigInt(subjectId);
  if (knowledgePointId) where.knowledgePointId = BigInt(knowledgePointId);
  if (chapterId) where.chapterId = BigInt(chapterId);

  const [total, records] = await Promise.all([
    prisma.userStudyRecord.count({ where }),
    prisma.userStudyRecord.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        chapter: {
          select: {
            id: true,
            name: true,
            grade: { select: { name: true } },
            publisher: { select: { name: true } },
          },
        },
        grade: { select: { name: true } },
      },
    }),
  ]);

  const serialized = records.map((r) => ({
    id: r.id,
    userId: r.userId,
    // 教材章节练习的记录没有分类，categoryId 为 null
    categoryId: r.categoryId?.toString() ?? null,
    gradeId: r.gradeId?.toString() ?? null,
    gradeName: r.grade?.name ?? r.chapter?.grade?.name ?? null,
    subjectId: r.subjectId?.toString() ?? null,
    knowledgePointId: r.knowledgePointId?.toString() ?? null,
    // 教材章节练习来源；考纲练习为 null
    chapterId: r.chapterId?.toString() ?? null,
    chapterName: r.chapter?.name ?? null,
    textbookLabel: r.chapter?.publisher
      ? `${r.chapter.publisher.name} · ${r.chapter.grade?.name ?? ""}`.replace(/ · $/, "")
      : null,
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

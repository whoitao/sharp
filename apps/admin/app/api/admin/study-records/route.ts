import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "10")));
  const search = searchParams.get("search") || "";

  const where = search
    ? {
        user: {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { nickname: { contains: search, mode: "insensitive" as const } },
          ],
        },
      }
    : {};

  const [total, records] = await Promise.all([
    prisma.userStudyRecord.count({ where }),
    prisma.userStudyRecord.findMany({
      where,
      include: {
        user: {
          select: { username: true, nickname: true },
        },
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
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // UserStudyRecord has no relation to Category, so resolve names separately.
  // 教材章节练习的记录 categoryId 为空，需要先过滤掉 null 再查分类名
  const categoryIds = [...new Set(records.map((r) => r.categoryId).filter((id): id is bigint => id != null))];
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryNameMap = new Map(categories.map((c) => [c.id.toString(), c.name]));

  // 显式列举字段并转换 BigInt，禁止展开原始 Prisma 对象（BigInt 会导致 JSON 序列化 500）
  const serialized = records.map((r: any) => ({
    id: r.id,
    userId: r.userId,
    user: { username: r.user?.username ?? null, nickname: r.user?.nickname ?? null },
    categoryId: r.categoryId?.toString() ?? null,
    categoryName: r.categoryId ? categoryNameMap.get(r.categoryId.toString()) ?? null : null,
    gradeId: r.gradeId?.toString() ?? null,
    gradeName: r.grade?.name ?? r.chapter?.grade?.name ?? null,
    unitIndex: r.unitIndex,
    // 教材章节练习来源（考纲练习为 null）
    chapterId: r.chapterId?.toString() ?? null,
    chapterName: r.chapter?.name ?? null,
    textbookLabel: r.chapter?.publisher
      ? `${r.chapter.publisher.name} · ${r.chapter.grade?.name ?? ""}`.replace(/ · $/, "")
      : null,
    subjectId: r.subjectId?.toString() ?? null,
    knowledgePointId: r.knowledgePointId?.toString() ?? null,
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

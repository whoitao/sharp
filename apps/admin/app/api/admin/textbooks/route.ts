import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { textbookCoverPublicUrl } from "@/lib/storage";
import { handleRouteError } from "@/lib/http";
import { parseBigIntId } from "@/lib/query";
import { textbookCreateSchema, textbooksQuerySchema, textbookUpdateSchema } from "@/lib/schemas";
import { NextRequest, NextResponse } from "next/server";

const SEMESTER_LABEL: Record<number, string> = { 0: "全一册", 1: "上册", 2: "下册" };

/** 教材展示名：科目 · 版本 · 年级+学期 */
function buildName(
  subjectName: string,
  publisherName: string,
  gradeName: string,
  semester: number,
): string {
  return `${subjectName} · ${publisherName} · ${gradeName}${SEMESTER_LABEL[semester] ?? ""}`;
}

/**
 * 指定教材集合的章节数与题数（章节 → 题目聚合）。
 * 只聚合传入教材范围内的数据，不再每次请求扫描整张 question 表。
 */
async function loadCounts(textbookIds: bigint[]) {
  const byTextbook = new Map<string, { chapterCount: number; questionCount: number }>();
  if (textbookIds.length === 0) return byTextbook;

  const [chapters, questionGroups] = await Promise.all([
    prisma.chapter.findMany({
      where: { textbookId: { in: textbookIds } },
      select: { id: true, textbookId: true },
    }),
    prisma.question.groupBy({
      by: ["chapterId"],
      where: { chapter: { textbookId: { in: textbookIds } } },
      _count: { _all: true },
    }),
  ]);

  const questionByChapter = new Map(
    questionGroups.map((g) => [g.chapterId?.toString() ?? "", g._count._all]),
  );
  for (const c of chapters) {
    const key = c.textbookId.toString();
    const entry = byTextbook.get(key) ?? { chapterCount: 0, questionCount: 0 };
    entry.chapterCount += 1;
    entry.questionCount += questionByChapter.get(c.id.toString()) ?? 0;
    byTextbook.set(key, entry);
  }
  return byTextbook;
}

function serialize(t: any) {
  return {
    id: t.id.toString(),
    name: t.name,
    subjectId: t.subjectId.toString(),
    subjectName: t.subject.name,
    subjectIcon: t.subject.icon ?? null,
    publisherId: t.publisherId.toString(),
    publisherName: t.publisher.name,
    stageId: t.stageId.toString(),
    stageName: t.stage.name,
    gradeId: t.gradeId.toString(),
    gradeName: t.grade.name,
    semester: t.semester,
    semesterLabel: SEMESTER_LABEL[t.semester] ?? "",
    coverUrl: t.coverUrl ? textbookCoverPublicUrl(t.coverUrl) : null,
    description: t.description ?? null,
    sortOrder: t.sortOrder,
    chapterCount: t.chapterCount ?? 0,
    questionCount: t.questionCount ?? 0,
    createdAt: t.createdAt,
  };
}

/** 教材列表，支持 学段/科目/年级/版本 过滤 */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "textbooks");
  if (admin instanceof NextResponse) return admin;

  try {
    const { stageId, subjectId, gradeId, publisherId } = textbooksQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );

    const textbooks = await prisma.textbook.findMany({
      where: { stageId, subjectId, gradeId, publisherId },
      include: {
        subject: { select: { name: true, icon: true } },
        publisher: { select: { name: true } },
        stage: { select: { name: true } },
        grade: { select: { name: true } },
      },
      orderBy: [{ stageId: "asc" }, { subjectId: "asc" }, { gradeId: "asc" }, { semester: "asc" }, { sortOrder: "asc" }],
    });

    const counts = await loadCounts(textbooks.map((t) => t.id));

    return NextResponse.json(
      textbooks.map((t) =>
        serialize({
          ...t,
          chapterCount: counts.get(t.id.toString())?.chapterCount ?? 0,
          questionCount: counts.get(t.id.toString())?.questionCount ?? 0,
        }),
      ),
    );
  } catch (err) {
    return handleRouteError(err, "admin/textbooks");
  }
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "textbooks");
  if (admin instanceof NextResponse) return admin;

  try {
    const body = textbookCreateSchema.parse(await request.json().catch(() => ({})));
    const { subjectId, gradeId, publisherId, semester, coverUrl, description, sortOrder } = body;

    const [subject, grade, publisher] = await Promise.all([
      prisma.subject.findUnique({ where: { id: subjectId }, select: { id: true, name: true } }),
      prisma.grade.findUnique({
        where: { id: gradeId },
        select: { id: true, name: true, stageId: true },
      }),
      prisma.publisher.findUnique({ where: { id: publisherId }, select: { id: true, name: true } }),
    ]);
    if (!subject || !grade || !publisher) {
      return NextResponse.json({ error: "科目/年级/版本不存在" }, { status: 400 });
    }

    const finalName = body.name?.trim()
      ? body.name.trim()
      : buildName(subject.name, publisher.name, grade.name, semester);

    const created = await prisma.textbook.create({
      data: {
        name: finalName,
        subjectId: subject.id,
        gradeId: grade.id,
        // 学段由年级推导，避免前端传入不一致
        stageId: grade.stageId,
        publisherId: publisher.id,
        semester,
        coverUrl: coverUrl || null,
        description: description?.trim() || null,
        sortOrder: sortOrder ?? 0,
      },
      include: {
        subject: { select: { name: true, icon: true } },
        publisher: { select: { name: true } },
        stage: { select: { name: true } },
        grade: { select: { name: true } },
      },
    });
    return NextResponse.json(
      serialize({ ...created, chapterCount: 0, questionCount: 0 }),
      { status: 201 },
    );
  } catch (err) {
    return handleRouteError(err, "admin/textbooks/create");
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requirePermission(request, "textbooks");
  if (admin instanceof NextResponse) return admin;

  try {
    const id = parseBigIntId(new URL(request.url).searchParams.get("id") ?? "", "id");
    const body = textbookUpdateSchema.parse(await request.json().catch(() => ({})));

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!body.name?.trim()) return NextResponse.json({ error: "name 不能为空" }, { status: 400 });
      data.name = body.name.trim();
    }
    if (body.subjectId !== undefined) data.subjectId = body.subjectId;
    if (body.publisherId !== undefined) data.publisherId = body.publisherId;
    if (body.semester !== undefined) data.semester = body.semester;
    if (body.gradeId !== undefined) {
      const grade = await prisma.grade.findUnique({
        where: { id: body.gradeId },
        select: { id: true, stageId: true },
      });
      if (!grade) return NextResponse.json({ error: "grade not found" }, { status: 400 });
      data.gradeId = grade.id;
      data.stageId = grade.stageId;
    }
    if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl || null;
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (body.sortOrder != null) data.sortOrder = body.sortOrder;

    const updated = await prisma.textbook.update({
      where: { id },
      data,
      include: {
        subject: { select: { name: true, icon: true } },
        publisher: { select: { name: true } },
        stage: { select: { name: true } },
        grade: { select: { name: true } },
      },
    });

    // 单条更新只统计该教材自身，避免触发全表聚合
    const counts = await loadCounts([updated.id]);
    return NextResponse.json(
      serialize({
        ...updated,
        chapterCount: counts.get(updated.id.toString())?.chapterCount ?? 0,
        questionCount: counts.get(updated.id.toString())?.questionCount ?? 0,
      }),
    );
  } catch (err) {
    return handleRouteError(err, "admin/textbooks/update");
  }
}

/** 删除保护：有章节或题目的教材禁止删除 */
export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "textbooks");
  if (admin instanceof NextResponse) return admin;

  try {
    const bigId = parseBigIntId(new URL(request.url).searchParams.get("id") ?? "", "id");

    const [chapterCount, questionCount] = await Promise.all([
      prisma.chapter.count({ where: { textbookId: bigId } }),
      prisma.question.count({ where: { chapter: { textbookId: bigId } } }),
    ]);
    if (chapterCount > 0 || questionCount > 0) {
      return NextResponse.json(
        { error: `该教材下仍有 ${chapterCount} 个章节、${questionCount} 道题目，无法删除` },
        { status: 409 },
      );
    }

    // 清引用与删除必须原子：否则删除失败会留下「设置已清空但教材还在」
    await prisma.$transaction([
      prisma.userSettings.updateMany({
        where: { textbookId: bigId },
        data: { textbookId: null },
      }),
      prisma.textbook.delete({ where: { id: bigId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, "admin/textbooks/delete");
  }
}

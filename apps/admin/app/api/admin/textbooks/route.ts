import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { textbookCoverPublicUrl } from "@/lib/storage";
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

/** 每个教材的章节数与题数（章节 → 题目聚合） */
async function loadCounts() {
  const [chapters, questionGroups] = await Promise.all([
    prisma.chapter.findMany({ select: { id: true, textbookId: true } }),
    prisma.question.groupBy({ by: ["chapterId"], _count: { _all: true } }),
  ]);
  const questionByChapter = new Map(
    questionGroups.map((g) => [g.chapterId?.toString() ?? "", g._count._all]),
  );
  const byTextbook = new Map<string, { chapterCount: number; questionCount: number }>();
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
    isbn: t.isbn ?? null,
    description: t.description ?? null,
    sortOrder: t.sortOrder,
    chapterCount: t.chapterCount ?? 0,
    questionCount: t.questionCount ?? 0,
    createdAt: t.createdAt,
  };
}

/** 教材列表，支持 学段/科目/年级/版本 过滤 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const stageId = url.searchParams.get("stageId");
  const subjectId = url.searchParams.get("subjectId");
  const gradeId = url.searchParams.get("gradeId");
  const publisherId = url.searchParams.get("publisherId");

  const [textbooks, counts] = await Promise.all([
    prisma.textbook.findMany({
      where: {
        stageId: stageId ? BigInt(stageId) : undefined,
        subjectId: subjectId ? BigInt(subjectId) : undefined,
        gradeId: gradeId ? BigInt(gradeId) : undefined,
        publisherId: publisherId ? BigInt(publisherId) : undefined,
      },
      include: {
        subject: { select: { name: true, icon: true } },
        publisher: { select: { name: true } },
        stage: { select: { name: true } },
        grade: { select: { name: true } },
      },
      orderBy: [{ stageId: "asc" }, { subjectId: "asc" }, { gradeId: "asc" }, { semester: "asc" }, { sortOrder: "asc" }],
    }),
    loadCounts(),
  ]);

  return NextResponse.json(
    textbooks.map((t) =>
      serialize({
        ...t,
        chapterCount: counts.get(t.id.toString())?.chapterCount ?? 0,
        questionCount: counts.get(t.id.toString())?.questionCount ?? 0,
      }),
    ),
  );
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { name, subjectId, gradeId, publisherId, semester, coverUrl, isbn, description, sortOrder } = body;

  if (!subjectId || !gradeId || !publisherId || semester == null) {
    return NextResponse.json(
      { error: "subjectId/gradeId/publisherId/semester 必填" },
      { status: 400 },
    );
  }

  const [subject, grade, publisher] = await Promise.all([
    prisma.subject.findUnique({ where: { id: BigInt(subjectId) }, select: { id: true, name: true } }),
    prisma.grade.findUnique({
      where: { id: BigInt(gradeId) },
      select: { id: true, name: true, stageId: true },
    }),
    prisma.publisher.findUnique({ where: { id: BigInt(publisherId) }, select: { id: true, name: true } }),
  ]);
  if (!subject || !grade || !publisher) {
    return NextResponse.json({ error: "科目/年级/版本不存在" }, { status: 400 });
  }
  if (![0, 1, 2].includes(Number(semester))) {
    return NextResponse.json({ error: "semester 只能是 0/1/2" }, { status: 400 });
  }

  const finalName = name?.trim()
    ? name.trim()
    : buildName(subject.name, publisher.name, grade.name, Number(semester));

  try {
    const created = await prisma.textbook.create({
      data: {
        name: finalName,
        subjectId: subject.id,
        gradeId: grade.id,
        // 学段由年级推导，避免前端传入不一致
        stageId: grade.stageId,
        publisherId: publisher.id,
        semester: Number(semester),
        coverUrl: coverUrl || null,
        isbn: isbn?.trim() || null,
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
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "同一科目、年级、版本、学期的教材已存在" },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function PATCH(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (!body.name?.trim()) return NextResponse.json({ error: "name 不能为空" }, { status: 400 });
    data.name = body.name.trim();
  }
  if (body.subjectId !== undefined) data.subjectId = BigInt(body.subjectId);
  if (body.publisherId !== undefined) data.publisherId = BigInt(body.publisherId);
  if (body.semester !== undefined) {
    if (![0, 1, 2].includes(Number(body.semester))) {
      return NextResponse.json({ error: "semester 只能是 0/1/2" }, { status: 400 });
    }
    data.semester = Number(body.semester);
  }
  if (body.gradeId !== undefined) {
    const grade = await prisma.grade.findUnique({
      where: { id: BigInt(body.gradeId) },
      select: { id: true, stageId: true },
    });
    if (!grade) return NextResponse.json({ error: "grade not found" }, { status: 400 });
    data.gradeId = grade.id;
    data.stageId = grade.stageId;
  }
  if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl || null;
  if (body.isbn !== undefined) data.isbn = body.isbn?.trim() || null;
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.sortOrder != null) data.sortOrder = body.sortOrder;

  try {
    const updated = await prisma.textbook.update({
      where: { id: BigInt(id) },
      data,
      include: {
        subject: { select: { name: true, icon: true } },
        publisher: { select: { name: true } },
        stage: { select: { name: true } },
        grade: { select: { name: true } },
      },
    });
    const counts = await loadCounts();
    return NextResponse.json(
      serialize({
        ...updated,
        chapterCount: counts.get(updated.id.toString())?.chapterCount ?? 0,
        questionCount: counts.get(updated.id.toString())?.questionCount ?? 0,
      }),
    );
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "同一科目、年级、版本、学期的教材已存在" },
        { status: 409 },
      );
    }
    throw err;
  }
}

/** 删除保护：有章节或题目的教材禁止删除 */
export async function DELETE(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const bigId = BigInt(id);
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

  // 清掉用户设置里的引用，避免外键报错
  await prisma.userSettings.updateMany({ where: { textbookId: bigId }, data: { textbookId: null } });
  await prisma.textbook.delete({ where: { id: bigId } });
  return NextResponse.json({ ok: true });
}

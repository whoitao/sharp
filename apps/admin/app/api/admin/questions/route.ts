import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/http";
import { sanitizeRichHtml } from "@/lib/rich-text";
import { questionCreateSchema, questionsQuerySchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "questions");
  if (admin instanceof NextResponse) return admin;

  try {
    const query = questionsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const { page, pageSize, subjectId, gradeId, knowledgePointId, chapterId, tagId, source, search } =
      query;

    const where: Prisma.QuestionWhereInput = {};
    if (subjectId) where.subjectId = subjectId;
    if (gradeId) where.gradeId = gradeId;
    if (knowledgePointId) {
      where.knowledgePoints = { some: { knowledgePointId } };
    }
    if (chapterId) where.chapterId = chapterId;
    if (tagId) {
      where.tags = { some: { tagId } };
    }
    if (source) where.source = source;
    if (search) {
      where.content = { contains: search, mode: "insensitive" };
    }

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        options: { orderBy: { sortNo: "asc" } },
        subject: true,
        grade: { select: { name: true } },
        chapter: {
          select: {
            id: true,
            name: true,
            // 章节维度（年级/版本）统一由教材反推
            textbook: {
              select: {
                grade: { select: { name: true } },
                publisher: { select: { name: true } },
              },
            },
          },
        },
        knowledgePoints: {
          include: { knowledgePoint: true },
        },
        tags: { include: { tag: true } },
      },
      orderBy: { sortOrder: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ]);

  const serialize = (q: any) => ({
    id: q.id.toString(),
    gradeId: q.gradeId?.toString() ?? null,
    gradeName: q.grade?.name ?? null,
    subjectId: q.subjectId?.toString() ?? null,
    subjectName: q.subject?.name ?? null,
    type: q.type,
    content: q.content,
    analysis: q.analysis,
    difficulty: q.difficulty,
    score: q.score,
    sortOrder: q.sortOrder,
    // 教材归属与来源
    chapterId: q.chapterId?.toString() ?? null,
    chapterName: q.chapter?.name ?? null,
    textbookLabel: q.chapter
      ? `${q.chapter.textbook?.publisher?.name ?? ""} · ${q.chapter.textbook?.grade?.name ?? ""}`.replace(/^ · /, "")
      : null,
    source: q.source,
    createdAt: q.createdAt,
    options: q.options.map((o: any) => ({
      id: o.id.toString(),
      questionId: o.questionId.toString(),
      optionKey: o.optionKey,
      content: o.content,
      isCorrect: o.isCorrect,
      sortNo: o.sortNo,
    })),
    knowledgePoints: q.knowledgePoints.map((qkp: any) => ({
      id: qkp.knowledgePoint.id.toString(),
      name: qkp.knowledgePoint.name,
      parentId: qkp.knowledgePoint.parentId?.toString() ?? null,
    })),
    tags: (q.tags ?? []).map((link: any) => ({
      id: link.tag.id.toString(),
      name: link.tag.name,
      type: link.tag.type,
    })),
  });

  return NextResponse.json({
    items: questions.map(serialize),
    total,
    page,
    pageSize,
  });
  } catch (err) {
    return handleRouteError(err, "admin/questions");
  }
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "questions");
  if (admin instanceof NextResponse) return admin;

  try {
    const {
      gradeId,
      subjectId,
      type,
      content,
      analysis,
      difficulty,
      score,
      sortOrder,
      chapterId,
      source,
      options,
      knowledgePointIds,
      tagIds,
    } = questionCreateSchema.parse(await request.json().catch(() => ({})));

    // 教材归属：传了 chapterId 必须存在，年级与科目由「章节 → 教材」反推
    let chapter:
      | { id: bigint; textbook: { gradeId: bigint; subjectId: bigint } }
      | null = null;
    if (chapterId) {
      chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        select: {
          id: true,
          textbook: { select: { gradeId: true, subjectId: true } },
        },
      });
      if (!chapter) {
        return NextResponse.json({ error: "chapter not found" }, { status: 400 });
      }
    }

    // 年级必填（教材题由章节反推）
    const finalGradeId = chapter ? chapter.textbook.gradeId : gradeId ?? null;
    if (!finalGradeId) {
      return NextResponse.json({ error: "gradeId 或 chapterId 必填" }, { status: 400 });
    }
    const finalSubjectId = chapter ? chapter.textbook.subjectId : subjectId ?? null;

    // H4：题干/解析/选项在入库前做白名单清洗
    const safeContent = sanitizeRichHtml(content);
    const safeAnalysis = analysis ? sanitizeRichHtml(analysis) : null;
    if (safeContent.trim() === "") {
      return NextResponse.json({ error: "题干不能为空" }, { status: 400 });
    }

    const question = await prisma.question.create({
    data: {
      gradeId: finalGradeId,
      subjectId: finalSubjectId,
      type,
      content: safeContent,
      analysis: safeAnalysis || null,
      difficulty,
      score,
      sortOrder,
      chapterId: chapter?.id ?? null,
      source,
      options: {
        create: options.map((opt: any, idx: number) => ({
          optionKey: opt.optionKey,
          content: sanitizeRichHtml(opt.content),
          isCorrect: opt.isCorrect || false,
          sortNo: idx,
        })),
      },
      ...(Array.isArray(knowledgePointIds) && knowledgePointIds.length > 0
        ? {
            knowledgePoints: {
              create: knowledgePointIds.map((kpId) => ({
                knowledgePointId: kpId,
              })),
            },
          }
        : {}),
      ...(Array.isArray(tagIds) && tagIds.length > 0
        ? {
            tags: {
              create: tagIds.map((tagId) => ({ tagId })),
            },
          }
        : {}),
    },
    include: {
      options: true,
      knowledgePoints: {
        include: { knowledgePoint: true },
      },
      tags: { include: { tag: true } },
    },
  });

  const serialize = (q: any) => ({
    ...q,
    id: q.id.toString(),
    gradeId: q.gradeId?.toString() ?? null,
    subjectId: q.subjectId?.toString() ?? null,
    // BigInt 不能直接 JSON 序列化，必须转字符串
    chapterId: q.chapterId?.toString() ?? null,
    source: q.source,
    options: q.options.map((o: any) => ({
      ...o,
      id: o.id.toString(),
      questionId: o.questionId.toString(),
    })),
    knowledgePoints: q.knowledgePoints.map((qkp: any) => ({
      id: qkp.knowledgePoint.id.toString(),
      name: qkp.knowledgePoint.name,
      parentId: qkp.knowledgePoint.parentId?.toString() ?? null,
    })),
    tags: (q.tags ?? []).map((link: any) => ({
      id: link.tag.id.toString(),
      name: link.tag.name,
      type: link.tag.type,
    })),
  });

  return NextResponse.json(serialize(question), { status: 201 });
  } catch (err) {
    return handleRouteError(err, "admin/questions/create");
  }
}

import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { handleRouteError } from "@/lib/http";
import { sanitizeRichHtml } from "@/lib/rich-text";
import { questionUpdateSchema } from "@/lib/schemas";
import { NextRequest, NextResponse } from "next/server";

function serialize(q: any) {
  return {
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
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission(request, "questions");
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;
    const questionId = BigInt(id);
    const body = questionUpdateSchema.parse(await request.json().catch(() => ({})));

    const data: Record<string, any> = {};
    if (body.gradeId !== undefined) data.gradeId = body.gradeId ?? null;
    if (body.subjectId !== undefined) data.subjectId = body.subjectId ?? null;
    if (body.type !== undefined) data.type = body.type;
    if (body.content !== undefined) {
      const safeContent = sanitizeRichHtml(body.content);
      if (safeContent.trim() === "") {
        return NextResponse.json({ error: "题干不能为空" }, { status: 400 });
      }
      data.content = safeContent;
    }
    if (body.analysis !== undefined) data.analysis = body.analysis ? sanitizeRichHtml(body.analysis) : null;
    if (body.difficulty !== undefined) data.difficulty = body.difficulty;
    if (body.score !== undefined) data.score = body.score;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.source !== undefined) data.source = body.source;

    // 教材归属：null / 空字符串表示取消归属；传了值必须存在，并同步年级与科目
    if (body.chapterId !== undefined) {
      if (!body.chapterId) {
        data.chapterId = null;
      } else {
        const chapter = await prisma.chapter.findUnique({
          where: { id: body.chapterId },
          select: {
            id: true,
            textbook: { select: { gradeId: true, subjectId: true } },
          },
        });
        if (!chapter) {
          return NextResponse.json({ error: "chapter not found" }, { status: 400 });
        }
        data.chapterId = chapter.id;
        data.gradeId = chapter.textbook.gradeId;
        data.subjectId = chapter.textbook.subjectId;
      }
    }

    // 选项 / 知识点 / 标签的替换必须整体成功或整体失败：
    // 先删后插分散执行时会留下「选项已删、题目未更新」这类半成品。
    const question = await prisma.$transaction(async (tx) => {
      await tx.question.update({ where: { id: questionId }, data });

      if (Array.isArray(body.options)) {
        await tx.questionOption.deleteMany({ where: { questionId } });
        await tx.questionOption.createMany({
          data: body.options.map((opt, idx) => ({
            questionId,
            optionKey: opt.optionKey,
            content: sanitizeRichHtml(opt.content),
            isCorrect: opt.isCorrect || false,
            sortNo: idx,
          })),
        });
      }

      if (Array.isArray(body.knowledgePointIds)) {
        await tx.questionKnowledgePoint.deleteMany({ where: { questionId } });
        if (body.knowledgePointIds.length > 0) {
          await tx.questionKnowledgePoint.createMany({
            data: body.knowledgePointIds.map((kpId) => ({
              questionId,
              knowledgePointId: kpId,
            })),
          });
        }
      }

      if (Array.isArray(body.tagIds)) {
        await tx.questionTagLink.deleteMany({ where: { questionId } });
        if (body.tagIds.length > 0) {
          await tx.questionTagLink.createMany({
            data: body.tagIds.map((tagId) => ({ questionId, tagId })),
          });
        }
      }

      return tx.question.findUnique({
        where: { id: questionId },
        include: {
          options: { orderBy: { sortNo: "asc" } },
          knowledgePoints: {
            include: { knowledgePoint: true },
          },
          tags: { include: { tag: true } },
        },
      });
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json(serialize(question));
  } catch (err) {
    return handleRouteError(err, "admin/questions/update");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission(request, "questions");
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;
    const questionId = BigInt(id);

    // 多表删除放在同一事务，避免「选项已删但题目还在」的部分成功
    await prisma.$transaction(async (tx) => {
      await tx.questionOption.deleteMany({ where: { questionId } });
      await tx.questionKnowledgePoint.deleteMany({ where: { questionId } });
      await tx.questionTagLink.deleteMany({ where: { questionId } });
      await tx.userQuestionProgress.deleteMany({ where: { questionId } });
      await tx.question.delete({ where: { id: questionId } });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleRouteError(err, "admin/questions/delete");
  }
}

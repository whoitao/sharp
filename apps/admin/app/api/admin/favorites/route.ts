import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/http";
import { favoritesQuerySchema } from "@/lib/schemas";

/** 题目摘要展示的最大字符数（表格只展示纯文本截断） */
const PREVIEW_LENGTH = 120;

/** 富文本题干转纯文本：去标签、常见实体反转义、合并空白 */
function toPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 用户收藏列表（后台）。
 * 用户与题目字段通过 include 一次带出，避免逐条查询造成 N+1。
 */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "questions");
  if (admin instanceof NextResponse) return admin;

  try {
    const query = favoritesQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const {
      page,
      pageSize,
      userSearch,
      questionSearch,
      gradeId,
      subjectId,
      startDate,
      endDate,
    } = query;

    const where: Prisma.UserQuestionFavoriteWhereInput = {};
    if (userSearch) {
      where.user = {
        OR: [
          { username: { contains: userSearch, mode: "insensitive" } },
          { nickname: { contains: userSearch, mode: "insensitive" } },
        ],
      };
    }

    const questionWhere: Prisma.QuestionWhereInput = {};
    if (gradeId) questionWhere.gradeId = gradeId;
    if (subjectId) questionWhere.subjectId = subjectId;
    if (questionSearch) {
      // 纯数字按题目 id 精确匹配，否则按题干关键词模糊匹配
      if (/^\d+$/.test(questionSearch)) {
        where.questionId = BigInt(questionSearch);
      } else {
        questionWhere.content = { contains: questionSearch, mode: "insensitive" };
      }
    }
    if (Object.keys(questionWhere).length > 0) {
      where.question = questionWhere;
    }

    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    const [total, records] = await Promise.all([
      prisma.userQuestionFavorite.count({ where }),
      prisma.userQuestionFavorite.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, nickname: true } },
          question: {
            select: {
              id: true,
              content: true,
              grade: { select: { name: true } },
              subject: { select: { name: true } },
              chapter: {
                select: {
                  id: true,
                  name: true,
                  textbook: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        // 收藏时间相同（批量导入/并发）时用题目 id 兜底，保证翻页稳定
        orderBy: [{ createdAt: "desc" }, { questionId: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = records.map((record) => {
      const plain = toPlainText(record.question.content);
      return {
        userId: record.userId,
        username: record.user.username,
        nickname: record.user.nickname ?? null,
        questionId: record.questionId.toString(),
        contentPreview:
          plain.length > PREVIEW_LENGTH ? `${plain.slice(0, PREVIEW_LENGTH)}…` : plain,
        gradeName: record.question.grade?.name ?? null,
        subjectName: record.question.subject?.name ?? null,
        textbookName: record.question.chapter?.textbook?.name ?? null,
        chapterName: record.question.chapter?.name ?? null,
        note: record.note,
        createdAt: record.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ items, total, page, pageSize });
  } catch (err) {
    return handleRouteError(err, "admin/favorites");
  }
}

/** 取消收藏：按 userId + questionId 精确删除单条记录 */
export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "questions");
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim();
  const rawQuestionId = searchParams.get("questionId")?.trim();
  if (!userId || !rawQuestionId || !/^\d+$/.test(rawQuestionId)) {
    return NextResponse.json(
      { error: "userId 和 questionId 必填，且 questionId 必须为数字" },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.userQuestionFavorite.deleteMany({
      where: { userId, questionId: BigInt(rawQuestionId) },
    });
    return NextResponse.json({ deleted: result.count });
  } catch (err) {
    return handleRouteError(err, "admin/favorites/delete");
  }
}

import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * 首页科目列表：科目基本信息 + 题目总数 + 当前用户已学比例。
 * 已学口径 = 该科目下已作答过（正确 / 错误）的去重题目数。
 */
export async function GET(request: NextRequest) {
  const user = requireAppUser(request);
  if (user instanceof NextResponse) return user;

  const [subjects, questionGroups, learnedRows] = await Promise.all([
    prisma.subject.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.question.groupBy({
      by: ["subjectId"],
      _count: { _all: true },
      where: { subjectId: { not: null } },
    }),
    // 进度记录里的 subjectId 是当时筛选条件，不代表题目所属科目，
    // 因此按题目自身的 subjectId 统计
    prisma.userQuestionProgress.findMany({
      where: {
        userId: user.id,
        status: { in: ["correct", "wrong"] },
      },
      select: { question: { select: { subjectId: true } } },
    }),
  ]);

  const questionCounts = new Map<string, number>();
  for (const group of questionGroups) {
    if (group.subjectId === null) continue;
    questionCounts.set(group.subjectId.toString(), group._count._all);
  }

  const learnedCounts = new Map<string, number>();
  for (const row of learnedRows) {
    const subjectId = row.question?.subjectId;
    if (!subjectId) continue;
    const key = subjectId.toString();
    learnedCounts.set(key, (learnedCounts.get(key) ?? 0) + 1);
  }

  return NextResponse.json(
    subjects.map((subject) => {
      const id = subject.id.toString();
      const questionCount = questionCounts.get(id) ?? 0;
      const learnedCount = Math.min(learnedCounts.get(id) ?? 0, questionCount);
      return {
        id,
        name: subject.name,
        icon: subject.icon,
        sortOrder: subject.sortOrder,
        questionCount,
        learnedCount,
        progress:
          questionCount > 0 ? Math.round((learnedCount / questionCount) * 100) : 0,
      };
    })
  );
}

import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * 题目标签列表（移动端筛选 chips）。
 * 可选 subjectId：只返回该科目下有关联题目的标签。
 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const url = new URL(request.url);
  const subjectIdRaw = url.searchParams.get("subjectId");
  const subjectId = subjectIdRaw ? BigInt(subjectIdRaw) : null;

  const tags = await prisma.questionTag.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    include: {
      _count: {
        select: { questions: subjectId ? { where: { question: { subjectId } } } : true },
      },
    },
  });

  return NextResponse.json(
    tags
      .map((t) => ({
        id: t.id.toString(),
        name: t.name,
        type: t.type,
        sortOrder: t.sortOrder,
        questionCount: t._count.questions,
      }))
      .filter((t) => !subjectId || t.questionCount > 0),
  );
}

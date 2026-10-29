import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// 再学一次：清掉本单元（同一组筛选条件下）之前的学习记录，从零开始新的一次。
// 题目进度（对错标记）和每日统计属于跨次学习的累计数据，这里不动。
// 教材章节练习与考纲练习各自独立计单元，靠 chapterId 区分。
export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = await request.json();
  const { categoryId, unitIndex, chapterId } = body;

  const isChapter = chapterId !== undefined && chapterId !== null;
  if (unitIndex === undefined || (categoryId === undefined && !isChapter)) {
    return NextResponse.json(
      { error: "unitIndex and (categoryId or chapterId) are required" },
      { status: 400 },
    );
  }

  const subjectIdRaw = request.nextUrl.searchParams.get("subjectId");
  const knowledgePointIdRaw = request.nextUrl.searchParams.get("knowledgePointId");

  const where = {
    userId: appUser.id,
    categoryId: isChapter ? null : BigInt(categoryId),
    chapterId: isChapter ? BigInt(chapterId) : null,
    unitIndex,
    subjectId: subjectIdRaw ? BigInt(subjectIdRaw) : null,
    // 章节练习不按知识点筛选，记录上的知识点固定为空
    knowledgePointId: isChapter || !knowledgePointIdRaw ? null : BigInt(knowledgePointIdRaw),
  };

  // 一单元一条记录：保留最近的一条重置为本次作答，历史版本残留的多条直接删除
  const records = await prisma.userStudyRecord.findMany({
    where,
    orderBy: { startedAt: "desc" },
  });

  if (records.length === 0) {
    return NextResponse.json({ success: true, cleared: false });
  }

  if (records.length > 1) {
    await prisma.userStudyRecord.deleteMany({
      where: { id: { in: records.slice(1).map((r) => r.id) } },
    });
  }

  await prisma.userStudyRecord.update({
    where: { id: records[0].id },
    data: {
      startedAt: new Date(),
      finishedAt: null,
      correctCount: 0,
      wrongCount: 0,
      durationSeconds: 0,
    },
  });

  return NextResponse.json({ success: true, cleared: true });
}

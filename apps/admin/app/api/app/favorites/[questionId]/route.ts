import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * 取消收藏。幂等：未收藏时同样返回 200，客户端无需区分。
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> },
) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const { questionId: questionIdParam } = await params;
  if (!/^\d+$/.test(questionIdParam)) {
    return NextResponse.json({ error: "Invalid questionId" }, { status: 400 });
  }
  const questionId = BigInt(questionIdParam);

  await prisma.userQuestionFavorite.deleteMany({
    where: { userId: appUser.id, questionId },
  });

  return NextResponse.json({
    data: { questionId: questionId.toString(), isFavorited: false },
  });
}

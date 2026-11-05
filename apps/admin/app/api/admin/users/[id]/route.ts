import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/middleware";
import { handleRouteError } from "@/lib/http";

/**
 * 学员详情。
 * UserSettings 的 gradeId/subjectId/publisherId/textbookId 是 BigInt，
 * 必须逐字段转字符串，否则 JSON 序列化会抛错（接口 500）。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission(request, "users");
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        settings: {
          select: {
            id: true,
            userId: true,
            unitSize: true,
            theme: true,
            language: true,
            density: true,
            gradeId: true,
            subjectId: true,
            publisherId: true,
            textbookId: true,
          },
        },
        _count: {
          select: {
            studyAttempts: true,
            questionProgress: true,
            dailyStats: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const settings = user.settings
      ? {
          ...user.settings,
          gradeId: user.settings.gradeId?.toString() ?? null,
          subjectId: user.settings.subjectId?.toString() ?? null,
          publisherId: user.settings.publisherId?.toString() ?? null,
          textbookId: user.settings.textbookId?.toString() ?? null,
        }
      : null;

    return NextResponse.json({ ...user, settings });
  } catch (err) {
    return handleRouteError(err, "admin/users/detail");
  }
}

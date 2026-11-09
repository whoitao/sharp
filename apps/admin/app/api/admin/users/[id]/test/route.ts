import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/middleware";
import { handleRouteError } from "@/lib/http";

const testSchema = z.object({
  isTest: z.boolean(),
});

/**
 * 标记 / 取消标记测试账号。
 * 依赖 requirePermission 做鉴权与 users:write 校验；
 * 记录不存在（P2025）与参数非法分别由统一错误映射返回 404 / 400。
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission(request, "users");
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;
    const body = testSchema.parse(await request.json().catch(() => ({})));

    const user = await prisma.user.update({
      where: { id },
      data: { isTest: body.isTest },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        status: true,
        isTest: true,
        source: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (err) {
    return handleRouteError(err, "admin/users/test");
  }
}

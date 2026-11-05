import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/middleware";
import { handleRouteError } from "@/lib/http";

const statusSchema = z.object({
  status: z.enum(["active", "disabled"]),
});

/**
 * 启用 / 禁用学员。
 * 只返回前端实际使用的白名单字段，避免 passwordHash、phone 等敏感字段外泄；
 * 记录不存在时由统一错误映射返回 404。
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission(request, "users");
  if (admin instanceof NextResponse) return admin;

  try {
    const { id } = await params;
    const body = statusSchema.parse(await request.json().catch(() => ({})));

    const user = await prisma.user.update({
      where: { id },
      data: { status: body.status },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (err) {
    return handleRouteError(err, "admin/users/status");
  }
}

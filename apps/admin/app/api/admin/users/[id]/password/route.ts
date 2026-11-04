import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/middleware";
import { hashPassword } from "@/lib/auth";

// 重置学员密码（POST 会被权限守卫推导为 users:write）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission(request, "users");
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await request.json();
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) },
  });

  return NextResponse.json({ ok: true });
}

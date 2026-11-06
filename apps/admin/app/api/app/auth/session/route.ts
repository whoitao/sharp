import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * Web 端 BFF 用于校验会话：用 App token 换取当前用户。
 * 只读接口，不改变既有 /api/app/** 的行为。
 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const user = await prisma.user.findUnique({
    where: { id: appUser.id },
    select: {
      id: true,
      username: true,
      nickname: true,
      avatar: true,
      gender: true,
      phone: true,
      status: true,
    },
  });

  // token 合法但用户已被删除时同样视为未登录
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.status !== "active") {
    return NextResponse.json({ error: "Account is disabled" }, { status: 403 });
  }

  return NextResponse.json({ user });
}

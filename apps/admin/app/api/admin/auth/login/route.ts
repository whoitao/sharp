import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signAdminToken } from "@/lib/auth";
import { loadUserPermissions } from "@/lib/middleware";
import { checkLimit, clientIp, recordFailure, resetLimit } from "@/lib/rate-limit";

/** 登录限流：账号 5 次失败 / 15 分钟，单 IP 20 次失败 / 15 分钟。 */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_FAILURE_LIMIT = 5;
const IP_FAILURE_LIMIT = 20;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const usernameRaw = body?.username;
    const password = body?.password;

    if (typeof usernameRaw !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }
    const username = usernameRaw.trim();
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // 账号维度统一小写，避免通过大小写变体绕过失败次数限制
    const accountKey = `login:account:${username.toLowerCase()}`;
    const ipKey = `login:ip:${clientIp(request)}`;
    const accountLimit = checkLimit(accountKey, ACCOUNT_FAILURE_LIMIT, LOGIN_WINDOW_MS);
    const ipLimit = checkLimit(ipKey, IP_FAILURE_LIMIT, LOGIN_WINDOW_MS);
    if (!accountLimit.allowed || !ipLimit.allowed) {
      return NextResponse.json(
        { error: "登录失败次数过多，请稍后重试" },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.max(accountLimit.retryAfterSeconds, ipLimit.retryAfterSeconds, 1),
            ),
          },
        }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        role: true,
        roleId: true,
        adminRole: { select: { code: true, name: true } },
      },
    });

    if (!admin) {
      recordFailure(accountKey, LOGIN_WINDOW_MS);
      recordFailure(ipKey, LOGIN_WINDOW_MS);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      recordFailure(accountKey, LOGIN_WINDOW_MS);
      recordFailure(ipKey, LOGIN_WINDOW_MS);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 登录成功清零账号维度失败计数
    resetLimit(accountKey);

    const roleCode = admin.adminRole?.code ?? admin.role;
    const token = signAdminToken({
      id: admin.id,
      username: admin.username,
      role: roleCode,
      roleId: admin.roleId,
    });

    const permissions = await loadUserPermissions({
      id: admin.id,
      username: admin.username,
      role: roleCode,
      roleId: admin.roleId,
    });

    return NextResponse.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: roleCode,
        roleName: admin.adminRole?.name ?? roleCode,
        roleId: admin.roleId,
        permissions,
      },
    });
  } catch (error) {
    console.error("[admin/auth/login] failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

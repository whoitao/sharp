import { adminApiBase } from "@/lib/auth/config";
import { isSameOrigin } from "@/lib/auth/csrf";
import { NextRequest, NextResponse } from "next/server";

interface RegisterBody {
  username?: unknown;
  password?: unknown;
}

/**
 * POST /api/auth/register
 * 注册接口本身不返回 token，这里也不会凭空建立会话：注册成功后由前端引导登录。
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid origin", code: "INVALID_ORIGIN" },
      { status: 403 },
    );
  }

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  if (username.length < 3 || username.length > 50) {
    return NextResponse.json(
      { error: "Username must be between 3 and 50 characters", code: "INVALID_USERNAME" },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters", code: "INVALID_PASSWORD" },
      { status: 400 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${adminApiBase()}/api/app/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Auth service unavailable", code: "UPSTREAM_UNAVAILABLE" },
      { status: 502 },
    );
  }

  const data = (await upstream.json().catch(() => null)) as {
    user?: unknown;
    error?: string;
  } | null;

  if (!upstream.ok) {
    const code =
      upstream.status === 409
        ? "USERNAME_TAKEN"
        : upstream.status === 400
          ? "INVALID_INPUT"
          : "UPSTREAM_ERROR";
    return NextResponse.json(
      { error: data?.error ?? "Register failed", code },
      { status: upstream.status === 409 ? 409 : upstream.status === 400 ? 400 : 502 },
    );
  }

  return NextResponse.json({ user: data?.user }, { status: 201 });
}

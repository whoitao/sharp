import { adminApiBase } from "@/lib/auth/config";
import { isSameOrigin } from "@/lib/auth/csrf";
import { createSession } from "@/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

/**
 * POST /api/auth/login
 * 服务端换取 App token 并写入 httpOnly Cookie，响应体中不返回 token。
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid origin", code: "INVALID_ORIGIN" },
      { status: 403 },
    );
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
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

  let upstream: Response;
  try {
    upstream = await fetch(`${adminApiBase()}/api/app/auth/login`, {
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
    token?: string;
    user?: unknown;
    error?: string;
  } | null;

  if (!upstream.ok || !data?.token) {
    const code =
      upstream.status === 401
        ? "INVALID_CREDENTIALS"
        : upstream.status === 403
          ? "ACCOUNT_DISABLED"
          : "UPSTREAM_ERROR";
    const status = upstream.status === 401 || upstream.status === 403 ? upstream.status : 502;
    return NextResponse.json(
      { error: data?.error ?? "Login failed", code },
      { status },
    );
  }

  await createSession(data.token);

  return NextResponse.json({ user: data.user });
}

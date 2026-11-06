import { adminApiBase } from "@/lib/auth/config";
import { isSameOrigin } from "@/lib/auth/csrf";
import { readSessionToken } from "@/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ path: string[] }> };

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

/**
 * /api/app/** 透传代理。
 * 浏览器不持有 token：这里从 httpOnly Cookie 取出 App JWT，以 Bearer 形式转发给 admin。
 * 既有 /api/app/** 行为不变，代理只增加一层会话门禁。
 */
async function forward(request: NextRequest, { params }: RouteContext) {
  const token = await readSessionToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 透传的写请求同样做同源校验，避免绕过 /api/auth/* 直接提交
  if (!METHODS_WITHOUT_BODY.has(request.method) && !isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Invalid origin", code: "INVALID_ORIGIN" },
      { status: 403 },
    );
  }

  const { path } = await params;
  const target = new URL(
    `${adminApiBase()}/api/app/${path.map(encodeURIComponent).join("/")}`,
  );
  target.search = request.nextUrl.search;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body:
        METHODS_WITHOUT_BODY.has(request.method) ||
        request.headers.get("content-length") === "0"
          ? undefined
          : await request.arrayBuffer(),
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return NextResponse.json(
      { error: "Upstream unavailable", code: "UPSTREAM_UNAVAILABLE" },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  responseHeaders.set(
    "content-type",
    upstream.headers.get("content-type") ?? "application/json",
  );
  // 答题与宠物读取带副作用，禁止任何中间层缓存
  responseHeaders.set("cache-control", "no-store");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export {
  forward as GET,
  forward as POST,
  forward as PUT,
  forward as PATCH,
  forward as DELETE,
  forward as HEAD,
};

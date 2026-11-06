import { SESSION_COOKIE } from "@/lib/auth/config";
import { NextRequest, NextResponse } from "next/server";

/**
 * 受保护路由骨架：只校验 Cookie 是否存在。
 * 真正的权限判断仍以服务端 /api/app/** 返回为准，这里只负责提前跳转。
 */
const PROTECTED_PREFIXES = ["/learn", "/account"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!needsAuth) return NextResponse.next();
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/learn/:path*", "/account/:path*"],
};

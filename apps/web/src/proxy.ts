import { SESSION_COOKIE } from "@/lib/auth/config";
import { isProtectedPath, loginUrlFor } from "@/lib/auth/routes";
import { NextRequest, NextResponse } from "next/server";

/**
 * 受保护页面的统一登录守卫（Web 端唯一入口）。
 *
 * 在渲染之前按 httpOnly 会话 Cookie 是否存在决定是否放行：
 * - 没有 Cookie：直接 307 到 /login?next=...，不会输出任何页面 HTML，
 *   因此不会闪现骨架，也不会有页面组件发起的接口请求（不会出现未登录 401）。
 * - 有 Cookie：放行，会话是否真实有效以服务端 /api/app/** 的校验结果为准。
 *
 * 路由清单集中在 lib/auth/routes.ts，不在页面/布局里重复判断。
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();

  return NextResponse.redirect(new URL(loginUrlFor(pathname, search), request.url));
}

export const config = {
  // 页面请求全量经过守卫，接口与静态资源不参与
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

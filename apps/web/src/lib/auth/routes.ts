/**
 * Web 端页面登录要求的唯一来源。
 *
 * 受保护（必须登录）：/learn/**（学习区、答题页）、/account/**（个人中心全部子页）。
 * 公开可访问：/（首页）、/login、/about、/articles/**、/docs、/wiki/**、/leaderboard。
 * /api/** 不经过页面守卫：/api/auth/** 公开，/api/app/** 由服务端接口自行校验会话。
 *
 * 新增受限页面时只改这个常量，不需要在页面或布局里再写一套判断。
 */
export const PROTECTED_ROUTE_PREFIXES = ["/learn", "/account"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** 受限页面未登录时跳转的登录地址，带上回跳地址（仅站内相对路径） */
export function loginUrlFor(pathname: string, search: string): string {
  const next = `${pathname}${search}`;
  return `/login?next=${encodeURIComponent(next)}`;
}

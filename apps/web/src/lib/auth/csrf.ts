/**
 * CSRF 防护：所有写请求都必须来自同源页面。
 * 配合 SameSite=Lax Cookie，阻断跨站表单/脚本提交。
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return false;

  try {
    if (new URL(origin).host === host) return true;
  } catch {
    return false;
  }

  // 反向代理或多域名部署时，可通过环境变量追加白名单（逗号分隔）
  const allowList = (process.env.WEB_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return allowList.includes(origin);
}

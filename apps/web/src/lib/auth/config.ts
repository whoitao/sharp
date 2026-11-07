/**
 * Web 学员端会话配置。
 * 浏览器只持有 httpOnly Cookie，真正的 App JWT 不会出现在客户端 JS / localStorage 中。
 */

export const SESSION_COOKIE = "sharp_student_session";

/** 与 App token 有效期保持一致（30 天） */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * 服务端访问 admin API 的基地址。
 * 本地开发默认 3001（apps/admin 的 dev 端口），生产默认正式域名。
 * 注意：只认 Web 自己的环境变量，移动端的 EXPO_PUBLIC_API_BASE_URL 不会被读取。
 */
export function adminApiBase(): string {
  const configured =
    process.env.ADMIN_API_BASE ?? process.env.NEXT_PUBLIC_API_BASE;
  if (configured) return configured.replace(/\/+$/, "");

  const fallback =
    process.env.NODE_ENV === "production"
      ? "https://admin.sharp.whoitao.top"
      : "http://localhost:3001";
  warnMissingBase(fallback);
  return fallback;
}

let warnedMissingBase = false;

/** 未配置基地址时在开发环境提示一次，避免静默回退到 3001 导致 502 无从排查 */
function warnMissingBase(fallback: string) {
  if (warnedMissingBase || process.env.NODE_ENV === "production") return;
  warnedMissingBase = true;
  console.warn(
    `[web] ADMIN_API_BASE 未配置，BFF 将回退到 ${fallback}。` +
      "如需转发到线上后端，请在 apps/web/.env 配置 ADMIN_API_BASE 并重启 dev server。",
  );
}

export interface AppUser {
  id: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
  gender: string | null;
  phone: string | null;
}

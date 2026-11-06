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
 */
export function adminApiBase(): string {
  const configured =
    process.env.ADMIN_API_BASE ?? process.env.NEXT_PUBLIC_API_BASE;
  if (configured) return configured.replace(/\/+$/, "");
  return process.env.NODE_ENV === "production"
    ? "https://admin.sharp.whoitao.top"
    : "http://localhost:3001";
}

export interface AppUser {
  id: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
  gender: string | null;
  phone: string | null;
}

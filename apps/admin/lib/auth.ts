import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// 启动期告警：缺失密钥时签发/校验会失败（fail-closed），但需要运维尽快补齐配置
if (!process.env.ADMIN_JWT_SECRET) {
  console.warn("[auth] 启动告警：ADMIN_JWT_SECRET 未配置，管理员登录与鉴权将不可用");
}
if (!process.env.APP_JWT_SECRET) {
  console.warn("[auth] 启动告警：APP_JWT_SECRET 未配置，端上登录与鉴权将不可用");
}

/**
 * 管理员 JWT 密钥必须显式配置：缺失时不再回落到默认串，
 * 否则任何知道默认值的人都能伪造超管 token。
 */
function getAdminSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    console.error("[auth] ADMIN_JWT_SECRET 未配置，拒绝签发管理员 token");
    throw new Error("ADMIN_JWT_SECRET is not configured");
  }
  return secret;
}

/** 端上 token 同样不允许回落到仓库中的默认串。 */
function getAppSecret(): string {
  const secret = process.env.APP_JWT_SECRET;
  if (!secret) {
    console.error("[auth] APP_JWT_SECRET 未配置，拒绝签发用户 token");
    throw new Error("APP_JWT_SECRET is not configured");
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface AdminTokenPayload {
  id: string;
  username: string;
  role: string;
  roleId?: string | null;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, getAdminSecret(), { expiresIn: "7d" });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    console.error("[auth] ADMIN_JWT_SECRET 未配置，所有管理员请求将视为未授权");
    return null;
  }
  try {
    return jwt.verify(token, secret) as AdminTokenPayload;
  } catch {
    return null;
  }
}

export function signAppToken(payload: { id: string; username: string }): string {
  return jwt.sign(payload, getAppSecret(), { expiresIn: "30d" });
}

export function verifyAppToken(token: string): { id: string; username: string } | null {
  if (!process.env.APP_JWT_SECRET) return null;
  try {
    return jwt.verify(token, getAppSecret()) as { id: string; username: string };
  } catch {
    return null;
  }
}

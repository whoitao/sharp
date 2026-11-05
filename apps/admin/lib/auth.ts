import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const APP_JWT_SECRET = process.env.APP_JWT_SECRET || "app-secret-change-me";

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
  return jwt.sign(payload, APP_JWT_SECRET, { expiresIn: "30d" });
}

export function verifyAppToken(token: string): { id: string; username: string } | null {
  try {
    return jwt.verify(token, APP_JWT_SECRET) as { id: string; username: string };
  } catch {
    return null;
  }
}

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "admin-secret-change-me";
const APP_JWT_SECRET = process.env.APP_JWT_SECRET || "app-secret-change-me";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAdminToken(payload: { id: string; username: string; role: string }): string {
  return jwt.sign(payload, ADMIN_JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAdminToken(token: string): { id: string; username: string; role: string } | null {
  try {
    return jwt.verify(token, ADMIN_JWT_SECRET) as { id: string; username: string; role: string };
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

import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  adminApiBase,
  type AppUser,
} from "./config";

/** 读取 Cookie 中的 App token（仅服务端可用） */
export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** 写入会话 Cookie：httpOnly + SameSite=Lax，生产环境强制 Secure */
export async function createSession(token: string): Promise<void> {
  const store = await cookies();
  store.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * 向 admin 校验当前会话。
 * 每次校验都带上 token，不缓存：用户被禁用后立即失效。
 */
export async function getSession(): Promise<AppUser | null> {
  const token = await readSessionToken();
  if (!token) return null;

  try {
    const res = await fetch(`${adminApiBase()}/api/app/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: AppUser };
    return data.user ?? null;
  } catch {
    return null;
  }
}

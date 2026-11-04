"use client";

import { can, canAny, type Permission } from "@/lib/permissions";
import { useCallback, useEffect, useState } from "react";

export interface AdminIdentity {
  id: string;
  username: string;
  role: string;
  roleName: string;
  roleId: string | null;
  permissions: string[];
}

const CACHE_KEY = "admin_identity";
const TOKEN_KEY = "admin_token";

type FetchStatus = "ok" | "unauthorized" | "error";

interface FetchResult {
  status: FetchStatus;
  identity: AdminIdentity | null;
}

let identityCache: AdminIdentity | null = null;
let inflight: Promise<FetchResult> | null = null;

function readLocal(): AdminIdentity | null {
  if (typeof window === "undefined") return null;
  // 没有 token 时缓存一律作废，避免退出登录后仍渲染后台
  if (!localStorage.getItem(TOKEN_KEY)) {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as AdminIdentity) : null;
  } catch {
    return null;
  }
}

/** 登录成功后立即写入本地身份，避免依赖二次 /me 请求 */
export function primeIdentity(identity: AdminIdentity) {
  identityCache = identity;
  if (typeof window !== "undefined") {
    localStorage.setItem(CACHE_KEY, JSON.stringify(identity));
  }
}

export async function fetchIdentity(force = false): Promise<FetchResult> {
  if (!force && identityCache) return { status: "ok", identity: identityCache };
  if (!force && inflight) return inflight;

  inflight = (async (): Promise<FetchResult> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return { status: "unauthorized", identity: null };
    try {
      const res = await fetch("/api/admin/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // 只有明确的鉴权失败才认定未登录；网络/服务端异常不踢人
      if (res.status === 401 || res.status === 403) {
        identityCache = null;
        localStorage.removeItem(CACHE_KEY);
        return { status: "unauthorized", identity: null };
      }
      if (!res.ok) return { status: "error", identity: null };
      const data = (await res.json()) as AdminIdentity;
      identityCache = data;
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      return { status: "ok", identity: data };
    } catch {
      return { status: "error", identity: null };
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** 角色权限被修改后调用，下一轮 usePermissions 会重新拉取 */
export function invalidateIdentity() {
  identityCache = null;
  if (typeof window !== "undefined") localStorage.removeItem(CACHE_KEY);
}

export function usePermissions() {
  const [identity, setIdentity] = useState<AdminIdentity | null>(() => readLocal());
  const [status, setStatus] = useState<FetchStatus | "loading">(() =>
    identityCache ? "ok" : "loading"
  );

  useEffect(() => {
    let cancelled = false;
    fetchIdentity()
      .then((res) => {
        if (cancelled) return;
        if (res.status === "ok") setIdentity(res.identity);
        else if (res.status === "unauthorized") setIdentity(null);
        // error：保留已有身份，不跳登录
        setStatus(res.status);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    invalidateIdentity();
    const res = await fetchIdentity(true);
    setIdentity(res.identity);
    setStatus(res.status);
    return res.identity;
  }, []);

  const permissions = identity?.permissions ?? [];
  const has = useCallback((perm: Permission) => can(permissions, perm), [permissions]);
  const hasAny = useCallback((perms: Permission[]) => canAny(permissions, perms), [permissions]);

  return {
    identity,
    permissions,
    loading: status === "loading",
    unauthenticated: status === "unauthorized",
    can: has,
    canAny: hasAny,
    isSuper: permissions.includes("*"),
    role: identity?.role ?? "",
    roleName: identity?.roleName ?? "",
    refresh,
  };
}

/** 无权限时直接不渲染子节点 */
export function PermissionGuard({
  perm,
  children,
  fallback = null,
}: {
  perm: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can: has, loading } = usePermissions();
  if (loading) return null;
  return has(perm) ? <>{children}</> : <>{fallback}</>;
}

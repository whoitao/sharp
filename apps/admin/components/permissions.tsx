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

let identityCache: AdminIdentity | null = null;
let inflight: Promise<AdminIdentity | null> | null = null;

function readLocal(): AdminIdentity | null {
  if (typeof window === "undefined") return null;
  // 没有 token 时缓存一律作废，避免退出登录后仍渲染后台
  if (!localStorage.getItem("admin_token")) {
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

export async function fetchIdentity(force = false): Promise<AdminIdentity | null> {
  if (!force && identityCache) return identityCache;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) return null;
    try {
      const res = await fetch("/api/admin/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // token 失效：清掉缓存，避免脏身份继续显示
        identityCache = null;
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      const data = (await res.json()) as AdminIdentity;
      identityCache = data;
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      return data;
    } catch {
      return null;
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
  const [loading, setLoading] = useState(() => !identityCache);

  useEffect(() => {
    let cancelled = false;
    fetchIdentity()
      .then((data) => {
        if (!cancelled) setIdentity(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    invalidateIdentity();
    const data = await fetchIdentity(true);
    setIdentity(data);
    return data;
  }, []);

  const permissions = identity?.permissions ?? [];
  const has = useCallback(
    (perm: Permission) => can(permissions, perm),
    [permissions]
  );
  const hasAny = useCallback(
    (perms: Permission[]) => canAny(permissions, perms),
    [permissions]
  );

  return {
    identity,
    permissions,
    loading,
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

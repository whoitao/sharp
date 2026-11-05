import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, verifyAppToken } from "./auth";
import { prisma } from "./prisma";
import {
  actionForMethod,
  can,
  permissionKey,
  type PermissionResource,
} from "./permissions";

export interface AdminUser {
  id: string;
  username: string;
  role: string;
  roleId?: string | null;
}

export function getAdminUser(request: NextRequest): AdminUser | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAdminToken(token);
}

export function requireAdmin(request: NextRequest): NextResponse | AdminUser {
  const user = getAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

// —— 权限缓存：30s TTL，角色权限变更后调用 invalidateRolePermissions 立即生效 ——
const PERM_CACHE_TTL = 30_000;
const permCache = new Map<string, { perms: string[]; at: number }>();

export function invalidateRolePermissions(roleId?: string) {
  if (roleId) permCache.delete(roleId);
  else permCache.clear();
}

/**
 * 解析管理员实际拥有的权限。
 * 每次鉴权都以数据库中的当前 roleId 为准，不信任 JWT 里的 roleId，
 * 这样调整角色/降权后旧 token 不会继续持有旧权限（立即生效）。
 * 角色权限本身仍按 roleId 做 30s 缓存，角色权限编辑时由
 * invalidateRolePermissions 主动失效。
 */
export async function loadUserPermissions(user: AdminUser): Promise<string[]> {
  const admin = await prisma.admin.findUnique({
    where: { id: user.id },
    select: { roleId: true },
  });
  const roleId = admin?.roleId ?? null;
  if (!roleId) return [];

  const hit = permCache.get(roleId);
  if (hit && Date.now() - hit.at < PERM_CACHE_TTL) return hit.perms;

  const role = await prisma.adminRole.findUnique({
    where: { id: roleId },
    select: { permissions: { select: { permission: true } } },
  });
  const perms = role?.permissions.map((p) => p.permission) ?? [];
  permCache.set(roleId, { perms, at: Date.now() });
  return perms;
}

/**
 * 权限守卫：resource 为模块名，动作由 HTTP 方法推导（GET/HEAD → read，其余 → write）。
 * 无 token → 401；无权限 → 403。
 */
export async function requirePermission(
  request: NextRequest,
  resource: PermissionResource
): Promise<NextResponse | AdminUser> {
  const user = getAdminUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const needed = permissionKey(resource, actionForMethod(request.method));
  const perms = await loadUserPermissions(user);
  if (!can(perms, needed)) {
    return NextResponse.json(
      { error: "Forbidden", permission: needed },
      { status: 403 }
    );
  }
  return user;
}

export function getAppUser(request: NextRequest): { id: string; username: string } | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);
  return verifyAppToken(token);
}

export function requireAppUser(request: NextRequest): NextResponse | { id: string; username: string } {
  const user = getAppUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

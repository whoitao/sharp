import { NextResponse } from "next/server";
import { apiError } from "./http";
import type { AdminUser } from "./middleware";
import { can, WILDCARD } from "./permissions";
import { prisma } from "./prisma";

const SUPER_ROLE_CODE = "super";

/** 统一 403：不暴露目标角色/账号等内部信息 */
function forbidden(): NextResponse {
  return apiError(403, "Forbidden");
}

/**
 * 用数据库中的当前角色信息覆盖 token 里的快照。
 * 角色调整后旧 token 仍会携带旧 roleId（M1 暂未处理），
 * 这里至少保证权限提升相关的守卫按“当前角色”判断，避免旧 token 绕过自角色限制。
 */
export async function resolveActor(actor: AdminUser): Promise<AdminUser> {
  const record = await prisma.admin.findUnique({
    where: { id: actor.id },
    select: {
      role: true,
      roleId: true,
      adminRole: { select: { code: true } },
    },
  });
  if (!record) return actor;
  return {
    ...actor,
    role: record.adminRole?.code ?? record.role,
    roleId: record.roleId ?? null,
  };
}

/**
 * 管理员角色分配守卫（创建、调整管理员共用）。
 * - 禁止修改自己的角色：既防自提权，也避免把自己锁死
 * - 只有 super 能把账号分配为 super
 * - 非 super 不能修改/回收任何 super 账号
 */
export function guardRoleAssignment(
  actor: AdminUser,
  options: {
    targetId?: string;
    /** 目标账号当前角色 code（创建时省略） */
    targetRoleCode?: string | null;
    /** 本次要分配的角色 code */
    nextRoleCode: string;
  },
): NextResponse | null {
  if (options.targetId && options.targetId === actor.id) return forbidden();

  if (options.nextRoleCode === SUPER_ROLE_CODE && actor.role !== SUPER_ROLE_CODE) {
    return forbidden();
  }

  if (options.targetRoleCode === SUPER_ROLE_CODE && actor.role !== SUPER_ROLE_CODE) {
    return forbidden();
  }

  return null;
}

/**
 * 角色权限编辑守卫（PATCH /api/admin/roles/:id 共用）。
 * - 只有 super 能编辑 super 角色；只有 super 能授予/保留通配符 "*"
 * - 禁止修改自己所属角色的权限
 * - 非 super 只能把角色权限设置为自己已有权限的子集
 *
 * super 角色本身固定为通配符，super 对它的权限提交属于无变更，放行以便同时修改名称等元信息。
 */
export function guardRolePermissionEdit(
  actor: AdminUser,
  actorPermissions: string[],
  options: {
    roleId: string;
    roleCode: string;
    requestedPermissions: string[];
  },
): NextResponse | null {
  const isSuper = actor.role === SUPER_ROLE_CODE;
  const isSuperRoleWildcardOnly =
    options.roleCode === SUPER_ROLE_CODE &&
    options.requestedPermissions.length === 1 &&
    options.requestedPermissions[0] === WILDCARD;

  if (isSuperRoleWildcardOnly) return isSuper ? null : forbidden();

  if (options.roleCode === SUPER_ROLE_CODE && !isSuper) return forbidden();
  if (options.roleId === actor.roleId) return forbidden();

  if (options.requestedPermissions.includes(WILDCARD) && !isSuper) return forbidden();

  if (
    !isSuper &&
    !options.requestedPermissions.every((permission) => can(actorPermissions, permission))
  ) {
    return forbidden();
  }

  return null;
}

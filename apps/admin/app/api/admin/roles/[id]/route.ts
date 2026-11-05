import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  invalidateRolePermissions,
  loadUserPermissions,
  requirePermission,
} from "@/lib/middleware";
import { guardRolePermissionEdit, resolveActor } from "@/lib/admin-guard";
import { ALL_PERMISSIONS, WILDCARD } from "@/lib/permissions";

const VALID_PERMISSIONS = new Set<string>([...ALL_PERMISSIONS, WILDCARD]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission(request, "roles");
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const role = await prisma.adminRole.findUnique({ where: { id } });
  if (!role) {
    return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  }

  const body = await request.json();
  const data: { name?: string; description?: string | null; sortOrder?: number } = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === "string" || body.description === null) {
    data.description = body.description?.trim() || null;
  }
  if (Number.isFinite(body.sortOrder)) data.sortOrder = Number(body.sortOrder);

  let permissions: string[] | null = null;
  if (Array.isArray(body.permissions)) {
    const invalid = (body.permissions as string[]).filter((p) => !VALID_PERMISSIONS.has(p));
    if (invalid.length) {
      return NextResponse.json({ error: `非法权限: ${invalid.join(", ")}` }, { status: 400 });
    }
    // 超级管理员固定为通配符，不允许被降权
    if (role.code === "super") {
      permissions = [WILDCARD];
    } else {
      permissions = body.permissions;
    }
    if (!permissions) {
      return NextResponse.json({ error: "权限不能为空" }, { status: 400 });
    }

    // H1：只有 super 能授予/保留 "*"；禁止修改自己所属角色；非 super 只能授予自己的权限子集
    const actor = await resolveActor(admin);
    const actorPermissions = await loadUserPermissions(actor);
    const denied = guardRolePermissionEdit(actor, actorPermissions, {
      roleId: role.id,
      roleCode: role.code,
      requestedPermissions: permissions,
    });
    if (denied) return denied;
  }

  await prisma.$transaction(async (tx) => {
    await tx.adminRole.update({ where: { id }, data });
    if (permissions) {
      await tx.adminRolePermission.deleteMany({ where: { roleId: id } });
      await tx.adminRolePermission.createMany({
        data: permissions.map((permission) => ({ roleId: id, permission })),
        skipDuplicates: true,
      });
    }
  });

  invalidateRolePermissions(id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePermission(request, "roles");
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const role = await prisma.adminRole.findUnique({
    where: { id },
    include: { _count: { select: { admins: true } } },
  });
  if (!role) {
    return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  }
  if (role.isSystem) {
    return NextResponse.json({ error: "内置角色不可删除" }, { status: 400 });
  }
  if (role._count.admins > 0) {
    return NextResponse.json(
      { error: `该角色下还有 ${role._count.admins} 个管理员，请先调整他们的角色` },
      { status: 400 }
    );
  }

  await prisma.adminRole.delete({ where: { id } });
  invalidateRolePermissions(id);

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadUserPermissions, requirePermission } from "@/lib/middleware";
import { guardRolePermissionEdit, resolveActor } from "@/lib/admin-guard";
import { ALL_PERMISSIONS, WILDCARD } from "@/lib/permissions";

const VALID_PERMISSIONS = new Set<string>([...ALL_PERMISSIONS, WILDCARD]);

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "roles");
  if (admin instanceof NextResponse) return admin;

  const roles = await prisma.adminRole.findMany({
    include: {
      permissions: { select: { permission: true } },
      _count: { select: { admins: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    data: roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      sortOrder: r.sortOrder,
      adminCount: r._count.admins,
      permissions: r.permissions.map((p) => p.permission),
    })),
  });
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "roles");
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : null;
  const permissions: string[] = Array.isArray(body.permissions) ? body.permissions : [];
  const sortOrder = Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0;

  if (!code || !/^[a-z][a-z0-9_-]{1,31}$/.test(code)) {
    return NextResponse.json({ error: "角色编码需为 2-32 位小写字母/数字/下划线" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "角色名称不能为空" }, { status: 400 });
  }
  const invalid = permissions.filter((p) => !VALID_PERMISSIONS.has(p));
  if (invalid.length) {
    return NextResponse.json({ error: `非法权限: ${invalid.join(", ")}` }, { status: 400 });
  }

  const exists = await prisma.adminRole.findUnique({ where: { code } });
  if (exists) {
    return NextResponse.json({ error: "角色编码已存在" }, { status: 409 });
  }

  // H1：创建角色同样只能授予自己已有的权限子集，非 super 不能授予 "*"
  const actor = await resolveActor(admin);
  const actorPermissions = await loadUserPermissions(actor);
  const denied = guardRolePermissionEdit(actor, actorPermissions, {
    roleId: "__new_role__",
    roleCode: code,
    requestedPermissions: permissions,
  });
  if (denied) return denied;

  const role = await prisma.adminRole.create({
    data: {
      code,
      name,
      description,
      sortOrder,
      isSystem: false,
      permissions: {
        createMany: { data: permissions.map((permission) => ({ permission })), skipDuplicates: true },
      },
    },
  });

  return NextResponse.json({ id: role.id }, { status: 201 });
}

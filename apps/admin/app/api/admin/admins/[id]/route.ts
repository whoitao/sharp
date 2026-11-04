import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateRolePermissions, requirePermission } from "@/lib/middleware";

// 调整某个管理员的角色
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await requirePermission(request, "admins");
  if (current instanceof NextResponse) return current;

  const { id } = await params;
  const body = await request.json();
  const roleId = typeof body.roleId === "string" ? body.roleId : "";
  if (!roleId) {
    return NextResponse.json({ error: "roleId 不能为空" }, { status: 400 });
  }

  const [target, role] = await Promise.all([
    prisma.admin.findUnique({ where: { id }, select: { id: true, roleId: true } }),
    prisma.adminRole.findUnique({ where: { id: roleId }, select: { id: true, code: true } }),
  ]);
  if (!target) return NextResponse.json({ error: "管理员不存在" }, { status: 404 });
  if (!role) return NextResponse.json({ error: "角色不存在" }, { status: 404 });

  // 不允许把自己降级，避免把自己锁在门外
  if (target.id === current.id && role.code !== "super") {
    return NextResponse.json({ error: "不能修改自己的角色" }, { status: 400 });
  }

  await prisma.admin.update({
    where: { id },
    data: { roleId: role.id, role: role.code },
  });

  invalidateRolePermissions(role.id);
  if (target.roleId) invalidateRolePermissions(target.roleId);

  return NextResponse.json({ ok: true });
}

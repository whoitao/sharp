import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateRolePermissions, requirePermission } from "@/lib/middleware";
import { guardRoleAssignment, resolveActor } from "@/lib/admin-guard";

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
    prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        roleId: true,
        role: true,
        adminRole: { select: { code: true } },
      },
    }),
    prisma.adminRole.findUnique({ where: { id: roleId }, select: { id: true, code: true } }),
  ]);
  if (!target) return NextResponse.json({ error: "管理员不存在" }, { status: 404 });
  if (!role) return NextResponse.json({ error: "角色不存在" }, { status: 404 });

  // H2/M5：禁止自改角色；非 super 不得分配/回收 super，也不得修改任何 super 账号
  const actor = await resolveActor(current);
  const denied = guardRoleAssignment(actor, {
    targetId: target.id,
    targetRoleCode: target.adminRole?.code ?? target.role,
    nextRoleCode: role.code,
  });
  if (denied) return denied;

  await prisma.admin.update({
    where: { id },
    data: { roleId: role.id, role: role.code },
  });

  invalidateRolePermissions(role.id);
  if (target.roleId) invalidateRolePermissions(target.roleId);

  return NextResponse.json({ ok: true });
}

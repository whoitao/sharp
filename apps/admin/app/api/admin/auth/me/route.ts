import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, loadUserPermissions } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const adminRecord = await prisma.admin.findUnique({
    where: { id: admin.id },
    select: {
      id: true,
      username: true,
      role: true,
      roleId: true,
      adminRole: { select: { code: true, name: true } },
      createdAt: true,
    },
  });

  if (!adminRecord) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  const permissions = await loadUserPermissions(admin);

  return NextResponse.json({
    id: adminRecord.id,
    username: adminRecord.username,
    role: adminRecord.adminRole?.code ?? adminRecord.role,
    roleName: adminRecord.adminRole?.name ?? adminRecord.role,
    roleId: adminRecord.roleId,
    permissions,
    createdAt: adminRecord.createdAt,
  });
}

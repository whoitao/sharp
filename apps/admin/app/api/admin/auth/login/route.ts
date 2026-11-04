import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signAdminToken } from "@/lib/auth";
import { loadUserPermissions } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        role: true,
        roleId: true,
        adminRole: { select: { code: true } },
      },
    });

    if (!admin) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const roleCode = admin.adminRole?.code ?? admin.role;
    const token = signAdminToken({
      id: admin.id,
      username: admin.username,
      role: roleCode,
      roleId: admin.roleId,
    });

    const permissions = await loadUserPermissions({
      id: admin.id,
      username: admin.username,
      role: roleCode,
      roleId: admin.roleId,
    });

    return NextResponse.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: roleCode,
        roleId: admin.roleId,
        permissions,
      },
    });
  } catch (error) {
    console.error("[admin/auth/login] failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

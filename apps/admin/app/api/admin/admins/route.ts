import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/middleware";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const current = await requirePermission(request, "admins");
  if (current instanceof NextResponse) return current;

  const body = await request.json();
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const roleId = typeof body.roleId === "string" ? body.roleId : "";

  if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) {
    return NextResponse.json(
      { error: "用户名需为 3-32 位字母/数字/下划线" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }
  if (!roleId) {
    return NextResponse.json({ error: "请选择角色" }, { status: 400 });
  }

  const [exists, role] = await Promise.all([
    prisma.admin.findUnique({ where: { username }, select: { id: true } }),
    prisma.adminRole.findUnique({ where: { id: roleId }, select: { id: true, code: true } }),
  ]);
  if (exists) {
    return NextResponse.json({ error: "该用户名已存在" }, { status: 409 });
  }
  if (!role) {
    return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  }

  const created = await prisma.admin.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      role: role.code,
      roleId: role.id,
    },
    select: { id: true, username: true },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "admins");
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "10")));
  const search = searchParams.get("search") || "";

  const where = search
    ? {
        OR: [
          { username: { contains: search, mode: "insensitive" as const } },
          { role: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, admins] = await Promise.all([
    prisma.admin.count({ where }),
    prisma.admin.findMany({
      where,
      select: {
        id: true,
        username: true,
        role: true,
        roleId: true,
        adminRole: { select: { code: true, name: true, isSystem: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data: admins.map((a) => ({
      id: a.id,
      username: a.username,
      role: a.adminRole?.code ?? a.role,
      roleName: a.adminRole?.name ?? a.role,
      roleId: a.roleId,
      roleIsSystem: a.adminRole?.isSystem ?? false,
      createdAt: a.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

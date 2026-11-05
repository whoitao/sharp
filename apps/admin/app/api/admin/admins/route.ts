import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/middleware";
import { guardRoleAssignment, resolveActor } from "@/lib/admin-guard";
import { hashPassword } from "@/lib/auth";
import { handleRouteError } from "@/lib/http";
import { adminCreateSchema, adminsQuerySchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const current = await requirePermission(request, "admins");
  if (current instanceof NextResponse) return current;

  try {
    const { username, password, roleId } = adminCreateSchema.parse(
      await request.json().catch(() => ({})),
    );

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

    // H3：创建管理员同样受角色分配规则约束，非 super 不能创建 super 账号
    const actor = await resolveActor(current);
    const denied = guardRoleAssignment(actor, { nextRoleCode: role.code });
    if (denied) return denied;

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
  } catch (err) {
    return handleRouteError(err, "admin/admins/create");
  }
}

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "admins");
  if (admin instanceof NextResponse) return admin;

  try {
    const query = adminsQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const { page, pageSize } = query;
    const search = query.search;

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
  } catch (err) {
    return handleRouteError(err, "admin/admins");
  }
}

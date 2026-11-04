import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/middleware";

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

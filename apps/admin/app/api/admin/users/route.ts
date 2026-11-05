import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/middleware";
import { handleRouteError } from "@/lib/http";
import { usersQuerySchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "users");
  if (admin instanceof NextResponse) return admin;

  try {
    const query = usersQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const { page, pageSize } = query;
    const search = query.search;

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { nickname: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          nickname: true,
          avatar: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { studyAttempts: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      data: users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    return handleRouteError(err, "admin/users");
  }
}

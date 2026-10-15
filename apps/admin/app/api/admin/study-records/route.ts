import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "10")));
  const search = searchParams.get("search") || "";

  const where = search
    ? {
        user: {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { nickname: { contains: search, mode: "insensitive" as const } },
          ],
        },
      }
    : {};

  const [total, records] = await Promise.all([
    prisma.userStudyRecord.count({ where }),
    prisma.userStudyRecord.findMany({
      where,
      include: {
        user: {
          select: { username: true, nickname: true },
        },
      },
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const serialized = records.map((r: any) => ({
    ...r,
    id: r.id,
    categoryId: r.categoryId.toString(),
  }));

  return NextResponse.json({
    data: serialized,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

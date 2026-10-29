import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 教材版本列表（移动端「按教材练习」的第一层选择） */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const publishers = await prisma.publisher.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { chapters: true } } },
  });

  return NextResponse.json(
    publishers.map((p) => ({
      id: p.id.toString(),
      name: p.name,
      chapterCount: p._count.chapters,
    })),
  );
}

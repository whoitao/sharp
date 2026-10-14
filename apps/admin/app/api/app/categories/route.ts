import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = requireAppUser(request);
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get("parentId") || "0";

  console.log('parentId', parentId);

  // parentId=0 means top-level (null in database)
  const where = parentId === "0"
    ? { parentId: null }
    : { parentId: BigInt(parentId) };

  const categories = await prisma.category.findMany({
    where,
    include: {
      _count: { select: { questions: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  const serialize = (c: any) => ({
    id: c.id.toString(),
    name: c.name,
    parentId: c.parentId ? c.parentId.toString() : "0",
    sortOrder: c.sortOrder,
    icon: c.icon,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    questionCount: c._count.questions,
  });

  return NextResponse.json(categories.map(serialize));
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const categories = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      _count: { select: { questions: true } },
      children: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: { select: { questions: true } },
          children: {
            include: {
              _count: { select: { questions: true } },
              children: {
                include: {
                  _count: { select: { questions: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  // Convert BigInt to string for JSON serialization
  const serialize = (node: any): any => ({
    id: node.id.toString(),
    name: node.name,
    parentId: node.parentId ? node.parentId.toString() : "0",
    sortOrder: node.sortOrder,
    icon: node.icon,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    _count: node._count,
    children: node.children ? node.children.map(serialize) : [],
  });

  return NextResponse.json(categories.map(serialize));
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { name, parentId = 0, sortOrder = 0, icon } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: {
      name,
      parentId: parentId === 0 ? null : BigInt(parentId),
      sortOrder,
      icon: icon || null,
    },
  });

  return NextResponse.json({
    ...category,
    id: category.id.toString(),
    parentId: category.parentId ? category.parentId.toString() : "0",
  }, { status: 201 });
}

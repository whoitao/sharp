import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 文章分类：名称唯一，有文章引用时禁止删除 */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "articles");
  if (admin instanceof NextResponse) return admin;

  const categories = await prisma.articleCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { _count: { select: { articles: true } } },
  });

  return NextResponse.json(
    categories.map((c) => ({
      id: c.id.toString(),
      name: c.name,
      sortOrder: c.sortOrder,
      articleCount: c._count.articles,
    })),
  );
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "articles");
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { name, sortOrder } = body;
  if (!name || name.trim() === "") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const category = await prisma.articleCategory.create({
    data: { name: name.trim(), sortOrder: sortOrder ?? 0 },
  });

  return NextResponse.json(
    {
      id: category.id.toString(),
      name: category.name,
      sortOrder: category.sortOrder,
      articleCount: 0,
    },
    { status: 201 },
  );
}

export async function PATCH(request: NextRequest) {
  const admin = await requirePermission(request, "articles");
  if (admin instanceof NextResponse) return admin;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (!body.name?.trim()) return NextResponse.json({ error: "name 不能为空" }, { status: 400 });
    data.name = body.name.trim();
  }
  if (body.sortOrder != null) data.sortOrder = body.sortOrder;

  const category = await prisma.articleCategory.update({
    where: { id: BigInt(id) },
    data,
  });

  return NextResponse.json({
    id: category.id.toString(),
    name: category.name,
    sortOrder: category.sortOrder,
  });
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "articles");
  if (admin instanceof NextResponse) return admin;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const count = await prisma.article.count({ where: { categoryId: BigInt(id) } });
  if (count > 0) {
    return NextResponse.json({ error: "该分类下仍有文章，无法删除" }, { status: 400 });
  }

  await prisma.articleCategory.delete({ where: { id: BigInt(id) } });
  return NextResponse.json({ ok: true });
}

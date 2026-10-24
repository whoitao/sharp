import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const user = requireAppUser(request);
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get("parentId") || "0";
  // all=1：一次返回全部分类并组装成树，避免移动端按 parentId 逐层请求
  const all = searchParams.get("all") === "1";

  // parentId=0 means top-level (null in database)
  const where = all
    ? {}
    : parentId === "0"
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

  const items = categories.map(serialize);

  if (!all) return NextResponse.json(items);

  // 按 parentId 组装树（根节点的 parentId 已序列化为 "0"）
  const buildTree = (pid: string): any[] =>
    items
      .filter((item) => item.parentId === pid)
      .map((item) => ({ ...item, children: buildTree(item.id) }));

  return NextResponse.json(buildTree("0"));
}

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
  const subjectIdRaw = searchParams.get("subjectId");

  // 指定科目：只返回该科目下有题目的分类（保留祖先层级），题数按子树聚合
  if (all && subjectIdRaw) {
    const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
    const groups = await prisma.question.groupBy({
      by: ["categoryId"],
      where: { subjectId: BigInt(subjectIdRaw) },
      _count: { _all: true },
    });
    const directCount = new Map<string, number>(
      groups.map((g) => [g.categoryId.toString(), g._count._all]),
    );

    const childrenMap = new Map<string, typeof categories>();
    for (const c of categories) {
      const pid = c.parentId ? c.parentId.toString() : "0";
      const list = childrenMap.get(pid) ?? [];
      list.push(c);
      childrenMap.set(pid, list);
    }

    const subtreeCount = (id: string): number => {
      let total = directCount.get(id) ?? 0;
      for (const child of childrenMap.get(id) ?? []) {
        total += subtreeCount(child.id.toString());
      }
      return total;
    };

    const build = (pid: string): any[] =>
      (childrenMap.get(pid) ?? [])
        .filter((c) => subtreeCount(c.id.toString()) > 0)
        .map((c) => {
          const id = c.id.toString();
          return {
            id,
            name: c.name,
            parentId: c.parentId ? c.parentId.toString() : "0",
            sortOrder: c.sortOrder,
            icon: c.icon,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            questionCount: subtreeCount(id),
            children: build(id),
          };
        });

    return NextResponse.json(build("0"));
  }

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

import { prisma } from "@/lib/prisma";
import type { WikiPublicTreeNodeDto } from "@sharp/shared";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 公开 Wiki 树：只返回已发布 + public 的节点，一次查询后在内存组树 */
export async function GET() {
  const rows = await prisma.wikiPage.findMany({
    where: {
      status: "published",
      visibility: "public",
      publishedAt: { lte: new Date() },
    },
    select: {
      id: true,
      parentId: true,
      title: true,
      slug: true,
      path: true,
      level: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  const byParent = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.parentId?.toString() ?? "";
    const list = byParent.get(key);
    if (list) list.push(row);
    else byParent.set(key, [row]);
  }

  const build = (parentKey: string): WikiPublicTreeNodeDto[] =>
    (byParent.get(parentKey) ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || Number(a.id - b.id))
      .map((row) => ({
        id: row.id.toString(),
        parentId: row.parentId?.toString() ?? null,
        title: row.title,
        slug: row.slug,
        path: row.path,
        level: row.level,
        sortOrder: row.sortOrder,
        children: build(row.id.toString()),
      }));

  return NextResponse.json(
    { data: { tree: build("") } },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}

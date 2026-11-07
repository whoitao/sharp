import { handleRouteError } from "@/lib/http";
import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { parseBigIntId } from "@/lib/query";
import { wikiMoveSchema } from "@/lib/schemas";
import {
  MAX_WIKI_DEPTH,
  WIKI_SORT_STEP,
  collectWikiSubtree,
  joinWikiPath,
  remapWikiPaths,
  sortWikiRows,
  wikiSubtreeHeight,
} from "@/lib/wiki";
import { NextRequest, NextResponse } from "next/server";

/**
 * 移动 / 排序：
 * - parentId = null 移到根，未传表示保持当前父节点
 * - beforeId = null 放到目标父节点末尾，否则插到该兄弟节点之前
 * - 更换父节点时同步重算整棵子树的 path / level
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requirePermission(request, "articles");
  if (admin instanceof NextResponse) return admin;

  try {
    const { id: rawId } = await params;
    const id = parseBigIntId(rawId);
    const body = wikiMoveSchema.parse(await request.json().catch(() => ({})));

    const existing = await prisma.wikiPage.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "页面不存在" }, { status: 404 });

    const nextParentId = body.parentId === undefined ? existing.parentId : body.parentId;

    const parent = nextParentId
      ? await prisma.wikiPage.findUnique({ where: { id: nextParentId } })
      : null;
    if (nextParentId && !parent) {
      return NextResponse.json({ error: "父节点不存在" }, { status: 400 });
    }

    const all = await prisma.wikiPage.findMany({
      select: { id: true, parentId: true, slug: true, path: true, level: true, sortOrder: true },
    });

    if (parent) {
      if (parent.id === existing.id) {
        return NextResponse.json({ error: "不能移动到自身" }, { status: 400 });
      }
      const descendants = collectWikiSubtree(all, existing.id);
      if (descendants.some((node) => node.id === parent.id)) {
        return NextResponse.json({ error: "不能移动到自己的子节点下" }, { status: 400 });
      }
      const nextLevel = parent.level + 1;
      if (nextLevel + wikiSubtreeHeight(all, existing.id) >= MAX_WIKI_DEPTH) {
        return NextResponse.json(
          { error: `Wiki 最多 ${MAX_WIKI_DEPTH} 层，当前子树放不下` },
          { status: 400 },
        );
      }
    }

    const duplicated = await prisma.wikiPage.findFirst({
      where: {
        parentId: nextParentId,
        slug: existing.slug,
        id: { not: existing.id },
      },
      select: { id: true },
    });
    if (duplicated) {
      return NextResponse.json({ error: "目标父节点下已存在相同 slug" }, { status: 409 });
    }

    // 重新编排目标父节点下的兄弟顺序
    const siblings = sortWikiRows(
      all.filter(
        (node) =>
          (node.parentId?.toString() ?? "") === (nextParentId?.toString() ?? "") &&
          node.id !== existing.id,
      ),
    );
    let insertAt = siblings.length;
    if (body.beforeId != null) {
      const index = siblings.findIndex((node) => node.id === body.beforeId);
      if (index < 0) {
        return NextResponse.json({ error: "beforeId 不是目标父节点下的兄弟" }, { status: 400 });
      }
      insertAt = index;
    }

    const ordered = [...siblings];
    ordered.splice(insertAt, 0, existing);

    const siblingUpdates: { id: bigint; sortOrder: number }[] = [];
    ordered.forEach((node, index) => {
      const sortOrder = (index + 1) * WIKI_SORT_STEP;
      if (node.id === existing.id) return;
      const current = all.find((item) => item.id === node.id);
      if (current && current.sortOrder !== sortOrder) {
        siblingUpdates.push({ id: node.id, sortOrder });
      }
    });

    const parentChanged = (existing.parentId?.toString() ?? "") !== (nextParentId?.toString() ?? "");
    let nextPath = existing.path;
    let nextLevel = existing.level;
    let pathUpdates: { id: bigint; path: string; level: number }[] = [];
    if (parentChanged) {
      nextPath = joinWikiPath(parent?.path, existing.slug);
      nextLevel = parent ? parent.level + 1 : 0;
      pathUpdates = remapWikiPaths(all, existing, nextPath, nextLevel);
    }

    await prisma.$transaction([
      prisma.wikiPage.update({
        where: { id },
        data: {
          parentId: nextParentId,
          sortOrder: (insertAt + 1) * WIKI_SORT_STEP,
          path: nextPath,
          level: nextLevel,
          updatedBy: admin.id,
        },
      }),
      ...siblingUpdates.map((item) =>
        prisma.wikiPage.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
      ...pathUpdates.map((item) =>
        prisma.wikiPage.update({
          where: { id: item.id },
          data: { path: item.path, level: item.level },
        }),
      ),
    ]);

    return NextResponse.json({
      id: id.toString(),
      parentId: nextParentId?.toString() ?? null,
      path: nextPath,
      level: nextLevel,
      sortOrder: (insertAt + 1) * WIKI_SORT_STEP,
    });
  } catch (err) {
    return handleRouteError(err, "admin/wiki/pages/move");
  }
}

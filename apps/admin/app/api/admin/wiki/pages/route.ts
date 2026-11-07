import { handleRouteError } from "@/lib/http";
import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { sanitizeRichHtml } from "@/lib/rich-text";
import { wikiPageCreateSchema } from "@/lib/schemas";
import {
  MAX_WIKI_DEPTH,
  WIKI_SORT_STEP,
  joinWikiPath,
  sortWikiRows,
} from "@/lib/wiki";
import type { WikiTreeNodeDto } from "@sharp/shared";
import { NextRequest, NextResponse } from "next/server";

function serializeTree(
  rows: {
    id: bigint;
    parentId: bigint | null;
    title: string;
    slug: string;
    path: string;
    level: number;
    sortOrder: number;
    status: string;
    visibility: string;
  }[],
): WikiTreeNodeDto[] {
  const byParent = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.parentId?.toString() ?? "";
    const list = byParent.get(key);
    if (list) list.push(row);
    else byParent.set(key, [row]);
  }

  const build = (parentKey: string): WikiTreeNodeDto[] =>
    sortWikiRows(byParent.get(parentKey) ?? []).map((row) => {
      const children = build(row.id.toString());
      return {
        id: row.id.toString(),
        parentId: row.parentId?.toString() ?? null,
        title: row.title,
        slug: row.slug,
        path: row.path,
        level: row.level,
        sortOrder: row.sortOrder,
        status: row.status === "published" ? "published" : "draft",
        visibility: row.visibility === "private" ? "private" : "public",
        childCount: children.length,
        children,
      };
    });

  return build("");
}

/**
 * 后台 Wiki 树：一次 findMany + 内存组树，列表不返回正文。
 * 支持 status / keyword 过滤：命中节点保留其祖先，保证树结构完整。
 */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "articles");
  if (admin instanceof NextResponse) return admin;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const keyword = url.searchParams.get("keyword")?.trim().toLowerCase();

    const all = await prisma.wikiPage.findMany({
      select: {
        id: true,
        parentId: true,
        title: true,
        slug: true,
        path: true,
        level: true,
        sortOrder: true,
        status: true,
        visibility: true,
      },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    });

    if (!status && !keyword) {
      return NextResponse.json({ tree: serializeTree(all) });
    }

    const byId = new Map(all.map((row) => [row.id.toString(), row]));
    const included = new Set<string>();
    for (const row of all) {
      const matchesStatus = !status || row.status === status;
      const matchesKeyword =
        !keyword ||
        row.title.toLowerCase().includes(keyword) ||
        row.path.toLowerCase().includes(keyword);
      if (!matchesStatus || !matchesKeyword) continue;
      // 命中节点 + 全部祖先
      let cursor: typeof row | undefined = row;
      while (cursor && !included.has(cursor.id.toString())) {
        included.add(cursor.id.toString());
        cursor = cursor.parentId ? byId.get(cursor.parentId.toString()) : undefined;
      }
    }

    return NextResponse.json({
      tree: serializeTree(all.filter((row) => included.has(row.id.toString()))),
    });
  } catch (err) {
    return handleRouteError(err, "admin/wiki/pages");
  }
}

/** 新建节点：同级 slug 唯一、深度受 MAX_WIKI_DEPTH 限制 */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "articles");
  if (admin instanceof NextResponse) return admin;

  try {
    const body = wikiPageCreateSchema.parse(await request.json().catch(() => ({})));

    const parent = body.parentId
      ? await prisma.wikiPage.findUnique({ where: { id: body.parentId } })
      : null;
    if (body.parentId && !parent) {
      return NextResponse.json({ error: "父节点不存在" }, { status: 400 });
    }

    const level = parent ? parent.level + 1 : 0;
    if (level >= MAX_WIKI_DEPTH) {
      return NextResponse.json(
        { error: `Wiki 最多 ${MAX_WIKI_DEPTH} 层` },
        { status: 400 },
      );
    }

    const parentId = parent?.id ?? null;
    const duplicated = await prisma.wikiPage.findFirst({
      where: { parentId, slug: body.slug },
      select: { id: true },
    });
    if (duplicated) {
      return NextResponse.json({ error: "同级 slug 已存在" }, { status: 409 });
    }

    let sortOrder = body.sortOrder ?? null;
    if (sortOrder == null) {
      const max = await prisma.wikiPage.aggregate({
        where: { parentId },
        _max: { sortOrder: true },
      });
      sortOrder = (max._max.sortOrder ?? 0) + WIKI_SORT_STEP;
    }

    const status = body.status === "published" ? "published" : "draft";
    const page = await prisma.wikiPage.create({
      data: {
        parentId,
        title: body.title,
        slug: body.slug,
        path: joinWikiPath(parent?.path, body.slug),
        level,
        sortOrder,
        summary: body.summary?.trim() || null,
        content: body.content ? sanitizeRichHtml(body.content) : null,
        status,
        visibility: body.visibility === "private" ? "private" : "public",
        publishedAt: status === "published" ? new Date() : null,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });

    return NextResponse.json(
      { id: page.id.toString(), path: page.path },
      { status: 201 },
    );
  } catch (err) {
    return handleRouteError(err, "admin/wiki/pages/create");
  }
}

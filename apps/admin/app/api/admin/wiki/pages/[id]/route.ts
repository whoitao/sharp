import { handleRouteError } from "@/lib/http";
import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { parseBigIntId } from "@/lib/query";
import { sanitizeRichHtml } from "@/lib/rich-text";
import { wikiPageUpdateSchema } from "@/lib/schemas";
import { joinWikiPath, remapWikiPaths } from "@/lib/wiki";
import type { WikiPageDetailDto } from "@sharp/shared";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

function serializeDetail(page: {
  id: bigint;
  parentId: bigint | null;
  title: string;
  slug: string;
  path: string;
  level: number;
  sortOrder: number;
  summary: string | null;
  content: string | null;
  status: string;
  visibility: string;
  publishedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): WikiPageDetailDto {
  return {
    id: page.id.toString(),
    parentId: page.parentId?.toString() ?? null,
    title: page.title,
    slug: page.slug,
    path: page.path,
    level: page.level,
    sortOrder: page.sortOrder,
    summary: page.summary,
    content: page.content,
    status: page.status === "published" ? "published" : "draft",
    visibility: page.visibility === "private" ? "private" : "public",
    publishedAt: page.publishedAt?.toISOString() ?? null,
    createdBy: page.createdBy,
    updatedBy: page.updatedBy,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

/** 单节点详情：编辑面板回填正文 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requirePermission(request, "articles");
  if (admin instanceof NextResponse) return admin;

  try {
    const { id: rawId } = await params;
    const id = parseBigIntId(rawId);
    const page = await prisma.wikiPage.findUnique({ where: { id } });
    if (!page) return NextResponse.json({ error: "页面不存在" }, { status: 404 });
    return NextResponse.json(serializeDetail(page));
  } catch (err) {
    return handleRouteError(err, "admin/wiki/pages/detail");
  }
}

/** 更新标题 / slug / 摘要 / 正文 / 状态 / 可见性 / 排序 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requirePermission(request, "articles");
  if (admin instanceof NextResponse) return admin;

  try {
    const { id: rawId } = await params;
    const id = parseBigIntId(rawId);
    const body = wikiPageUpdateSchema.parse(await request.json().catch(() => ({})));

    const existing = await prisma.wikiPage.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "页面不存在" }, { status: 404 });

    const data: Prisma.WikiPageUpdateInput = { updatedBy: admin.id };

    if (body.title !== undefined) data.title = body.title;
    if (body.summary !== undefined) data.summary = body.summary?.trim() || null;
    if (body.visibility !== undefined) data.visibility = body.visibility;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.content !== undefined) {
      data.content = body.content ? sanitizeRichHtml(body.content) : null;
    }
    if (body.status !== undefined) {
      data.status = body.status;
      // 首次发布补发布时间；下线后重新发布保留原始发布时间
      if (body.status === "published" && existing.publishedAt == null) {
        data.publishedAt = new Date();
      }
    }

    let pathUpdates: { id: bigint; path: string; level: number }[] = [];
    if (body.slug !== undefined && body.slug !== existing.slug) {
      const duplicated = await prisma.wikiPage.findFirst({
        where: { parentId: existing.parentId, slug: body.slug, id: { not: id } },
        select: { id: true },
      });
      if (duplicated) {
        return NextResponse.json({ error: "同级 slug 已存在" }, { status: 409 });
      }

      const parent = existing.parentId
        ? await prisma.wikiPage.findUnique({
            where: { id: existing.parentId },
            select: { path: true },
          })
        : null;
      const nextPath = joinWikiPath(parent?.path, body.slug);
      data.slug = body.slug;
      data.path = nextPath;

      const all = await prisma.wikiPage.findMany({
        select: { id: true, parentId: true, path: true, level: true },
      });
      pathUpdates = remapWikiPaths(all, existing, nextPath, existing.level);
    }

    const [page] = await prisma.$transaction([
      prisma.wikiPage.update({ where: { id }, data }),
      ...pathUpdates.map((item) =>
        prisma.wikiPage.update({
          where: { id: item.id },
          data: { path: item.path, level: item.level },
        }),
      ),
    ]);

    return NextResponse.json(serializeDetail(page));
  } catch (err) {
    return handleRouteError(err, "admin/wiki/pages/update");
  }
}

/** 删除：有子节点时必须显式 cascade=true */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requirePermission(request, "articles");
  if (admin instanceof NextResponse) return admin;

  try {
    const { id: rawId } = await params;
    const id = parseBigIntId(rawId);
    const cascade = new URL(request.url).searchParams.get("cascade") === "true";

    const existing = await prisma.wikiPage.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "页面不存在" }, { status: 404 });

    const childCount = await prisma.wikiPage.count({ where: { parentId: id } });
    if (childCount > 0 && !cascade) {
      return NextResponse.json(
        { error: "该节点下还有子节点，请确认级联删除", childCount },
        { status: 409 },
      );
    }

    // 数据库自引用外键 ON DELETE CASCADE 会清理整棵子树
    await prisma.wikiPage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, "admin/wiki/pages/delete");
  }
}

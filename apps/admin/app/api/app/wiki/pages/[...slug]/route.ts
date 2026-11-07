import { prisma } from "@/lib/prisma";
import type { WikiPublicPageDetailDto } from "@sharp/shared";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 公开详情：按 path 精确查询，草稿 / 私有 / 未到发布时间一律 404 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const path = slug.map((part) => decodeURIComponent(part)).join("/");

  const page = await prisma.wikiPage.findFirst({
    where: {
      path,
      status: "published",
      visibility: "public",
      publishedAt: { lte: new Date() },
    },
  });

  if (!page) {
    return NextResponse.json(
      { error: "页面不存在" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const data: WikiPublicPageDetailDto = {
    id: page.id.toString(),
    parentId: page.parentId?.toString() ?? null,
    title: page.title,
    slug: page.slug,
    path: page.path,
    level: page.level,
    summary: page.summary,
    content: page.content,
    publishedAt: page.publishedAt?.toISOString() ?? null,
    updatedAt: page.updatedAt.toISOString(),
  };

  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
      },
    },
  );
}

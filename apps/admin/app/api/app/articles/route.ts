import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const CHANNELS = ["web", "mobile"];

/**
 * 前台文章列表（公开）：只返回已发布且包含指定频道的文章。
 * 列表不返回正文，正文由详情接口按需加载。
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel");
  if (!channel || !CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "channel 非法" }, { status: 400 });
  }

  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20)));
  const categoryId = url.searchParams.get("categoryId");

  const where: Record<string, unknown> = {
    status: "published",
    channels: { has: channel },
  };
  if (categoryId) where.categoryId = BigInt(categoryId);

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ sortOrder: "desc" }, { publishedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        summary: true,
        publishedAt: true,
        viewCount: true,
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id.toString(),
      title: a.title,
      summary: a.summary,
      publishedAt: a.publishedAt,
      viewCount: a.viewCount,
      categoryId: a.category.id.toString(),
      categoryName: a.category.name,
    })),
    total,
    page,
    pageSize,
  });
}

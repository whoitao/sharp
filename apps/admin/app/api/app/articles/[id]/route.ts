import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const CHANNELS = ["web", "mobile"];

/**
 * 前台文章详情（公开）：文章必须已发布且包含请求频道，否则视为不存在。
 * view=1 时浏览量自增，列表与页面 metadata 请求不自增，避免重复计数。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  const url = new URL(request.url);
  const channel = url.searchParams.get("channel");
  if (!channel || !CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "channel 非法" }, { status: 400 });
  }

  const article = await prisma.article.findFirst({
    where: {
      id: BigInt(id),
      status: "published",
      channels: { has: channel },
    },
    include: { category: { select: { id: true, name: true } } },
  });

  if (!article) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  if (url.searchParams.get("view") === "1") {
    await prisma.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  return NextResponse.json({
    id: article.id.toString(),
    title: article.title,
    summary: article.summary,
    content: article.content,
    publishedAt: article.publishedAt,
    viewCount: article.viewCount + (url.searchParams.get("view") === "1" ? 1 : 0),
    categoryId: article.category.id.toString(),
    categoryName: article.category.name,
  });
}

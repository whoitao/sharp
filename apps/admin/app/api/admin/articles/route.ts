import { requireAdmin } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const CHANNELS = ["web", "mobile"];
const STATUSES = ["draft", "published"];

/** 频道字段校验：至少选择一个，且只允许 web / mobile */
function normalizeChannels(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const channels = [...new Set(value.map((v) => String(v)))].filter((v) =>
    CHANNELS.includes(v),
  );
  return channels.length > 0 ? channels : null;
}

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const url = new URL(request.url);
  // 详情模式：编辑弹窗需要回填正文，列表接口本身不返回 content
  const id = url.searchParams.get("id");
  if (id) {
    const article = await prisma.article.findUnique({
      where: { id: BigInt(id) },
      include: { category: { select: { name: true } } },
    });
    if (!article) return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    return NextResponse.json({
      id: article.id.toString(),
      title: article.title,
      summary: article.summary,
      content: article.content,
      categoryId: article.categoryId.toString(),
      categoryName: article.category.name,
      channels: article.channels,
      status: article.status,
      publishedAt: article.publishedAt,
      viewCount: article.viewCount,
      sortOrder: article.sortOrder,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
    });
  }

  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20)));
  const keyword = url.searchParams.get("keyword")?.trim();
  const status = url.searchParams.get("status");
  const channel = url.searchParams.get("channel");
  const categoryId = url.searchParams.get("categoryId");

  const where: Record<string, unknown> = {};
  if (keyword) where.title = { contains: keyword, mode: "insensitive" };
  if (status && STATUSES.includes(status)) where.status = status;
  if (channel && CHANNELS.includes(channel)) where.channels = { has: channel };
  if (categoryId) where.categoryId = BigInt(categoryId);

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ sortOrder: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      // 列表不返回正文，避免富文本把响应体撑大
      select: {
        id: true,
        title: true,
        summary: true,
        categoryId: true,
        category: { select: { name: true } },
        channels: true,
        status: true,
        publishedAt: true,
        viewCount: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id.toString(),
      title: a.title,
      summary: a.summary,
      categoryId: a.categoryId.toString(),
      categoryName: a.category.name,
      channels: a.channels,
      status: a.status,
      publishedAt: a.publishedAt,
      viewCount: a.viewCount,
      sortOrder: a.sortOrder,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
    total,
  });
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";
  const channels = normalizeChannels(body.channels);
  const categoryId = body.categoryId;
  const status = body.status === "published" ? "published" : "draft";

  if (!title) return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  if (!content || content.trim() === "") {
    return NextResponse.json({ error: "正文不能为空" }, { status: 400 });
  }
  if (!channels) return NextResponse.json({ error: "请至少选择一个发布频道" }, { status: 400 });
  if (!categoryId) return NextResponse.json({ error: "请选择文章分类" }, { status: 400 });

  const article = await prisma.article.create({
    data: {
      title,
      summary: typeof body.summary === "string" && body.summary.trim() !== "" ? body.summary.trim() : null,
      content,
      categoryId: BigInt(categoryId),
      channels,
      status,
      publishedAt: status === "published" ? new Date() : null,
      sortOrder: Number(body.sortOrder ?? 0),
      createdBy: admin.id,
    },
  });

  return NextResponse.json({ id: article.id.toString() }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.article.findUnique({ where: { id: BigInt(id) } });
  if (!existing) return NextResponse.json({ error: "文章不存在" }, { status: 404 });

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    data.title = title;
  }
  if (body.content !== undefined) {
    if (typeof body.content !== "string" || body.content.trim() === "") {
      return NextResponse.json({ error: "正文不能为空" }, { status: 400 });
    }
    data.content = body.content;
  }
  if (body.summary !== undefined) {
    data.summary =
      typeof body.summary === "string" && body.summary.trim() !== "" ? body.summary.trim() : null;
  }
  if (body.categoryId !== undefined) {
    if (!body.categoryId) return NextResponse.json({ error: "请选择文章分类" }, { status: 400 });
    data.categoryId = BigInt(body.categoryId);
  }
  if (body.channels !== undefined) {
    const channels = normalizeChannels(body.channels);
    if (!channels) return NextResponse.json({ error: "请至少选择一个发布频道" }, { status: 400 });
    data.channels = channels;
  }
  if (body.sortOrder != null) data.sortOrder = Number(body.sortOrder);
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "status 非法" }, { status: 400 });
    }
    data.status = body.status;
    // 首次发布时补发布时间；下线后重新发布仍保留原始发布时间
    if (body.status === "published" && existing.publishedAt == null) {
      data.publishedAt = new Date();
    }
  }

  const article = await prisma.article.update({ where: { id: BigInt(id) }, data });
  return NextResponse.json({ id: article.id.toString(), status: article.status });
}

export async function DELETE(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.article.delete({ where: { id: BigInt(id) } });
  return NextResponse.json({ ok: true });
}

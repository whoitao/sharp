import { handleRouteError } from "@/lib/http";
import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { parsePageParams } from "@/lib/query";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "notifications");
  if (admin instanceof NextResponse) return admin;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id && !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "id invalid" }, { status: 400 });
    }
    if (id) {
      const item = await prisma.notification.findUnique({
        where: { id: BigInt(id) },
        include: {
          template: { select: { name: true, code: true } },
          _count: { select: { reads: true } },
        },
      });
      if (!item) return NextResponse.json({ error: "消息不存在" }, { status: 404 });
      return NextResponse.json({
        id: item.id.toString(),
        templateId: item.templateId?.toString() ?? null,
        templateCode: item.templateCode,
        templateName: item.template?.name ?? null,
        type: item.type,
        level: item.level,
        title: item.title,
        body: item.body,
        actionType: item.actionType,
        actionValue: item.actionValue,
        deliveryMode: item.deliveryMode,
        userId: item.userId,
        variables: item.variables,
        status: item.status,
        isTest: item.isTest,
        publishedAt: item.publishedAt,
        expireAt: item.expireAt,
        revokedAt: item.revokedAt,
        readCount: item._count.reads,
        createdBy: item.createdBy,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        failureReason: null,
      });
    }

    const { page, pageSize } = parsePageParams(url.searchParams, { defaultPageSize: 20 });
    const keyword = url.searchParams.get("keyword")?.trim();
    const type = url.searchParams.get("type");
    const status = url.searchParams.get("status");
    const deliveryMode = url.searchParams.get("deliveryMode");
    const templateCode = url.searchParams.get("templateCode");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (keyword) where.title = { contains: keyword, mode: "insensitive" };
    if (type) where.type = type;
    if (status) where.status = status;
    if (deliveryMode) where.deliveryMode = deliveryMode;
    if (templateCode) where.templateCode = templateCode;

    const createdAt: Record<string, Date> = {};
    if (from) createdAt.gte = new Date(from);
    if (to) createdAt.lte = new Date(to);
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { reads: true } } },
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id.toString(),
        templateCode: item.templateCode,
        type: item.type,
        level: item.level,
        title: item.title,
        body: item.body,
        deliveryMode: item.deliveryMode,
        userId: item.userId,
        status: item.status,
        isTest: item.isTest,
        publishedAt: item.publishedAt,
        expireAt: item.expireAt,
        revokedAt: item.revokedAt,
        readCount: item._count.reads,
        createdAt: item.createdAt,
      })),
      total,
      page,
      pageSize,
    });
  } catch (err) {
    return handleRouteError(err, "notifications GET");
  }
}

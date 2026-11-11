import { Prisma } from "@prisma/client";
import { handleRouteError } from "@/lib/http";
import { requirePermission } from "@/lib/middleware";
import {
  NotificationError,
  parseVariableDeclarations,
  validateTemplateDraft,
  type TemplateDraft,
} from "@/lib/notification";
import { prisma } from "@/lib/prisma";
import { parsePageParams } from "@/lib/query";
import { NextRequest, NextResponse } from "next/server";

function draftFromBody(body: Record<string, unknown>, code: string): TemplateDraft {
  return {
    code,
    name: typeof body.name === "string" ? body.name.trim() : "",
    type: typeof body.type === "string" ? body.type : "",
    level: typeof body.level === "string" ? body.level : "info",
    deliveryMode: typeof body.deliveryMode === "string" ? body.deliveryMode : "",
    titleTemplate: typeof body.titleTemplate === "string" ? body.titleTemplate : "",
    bodyTemplate: typeof body.bodyTemplate === "string" ? body.bodyTemplate : "",
    actionType: typeof body.actionType === "string" ? body.actionType : "none",
    actionValueTemplate:
      typeof body.actionValueTemplate === "string" && body.actionValueTemplate.trim() !== ""
        ? body.actionValueTemplate.trim()
        : null,
    dedupeKeyTemplate:
      typeof body.dedupeKeyTemplate === "string" && body.dedupeKeyTemplate.trim() !== ""
        ? body.dedupeKeyTemplate.trim()
        : null,
    variables: parseVariableDeclarations(body.variables),
    enabled: body.enabled !== false,
  };
}

function serializeTemplate(template: {
  id: bigint;
  code: string;
  name: string;
  type: string;
  level: string;
  deliveryMode: string;
  titleTemplate: string;
  bodyTemplate: string;
  actionType: string;
  actionValueTemplate: string | null;
  dedupeKeyTemplate: string | null;
  variables: unknown;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { notifications: number };
}) {
  return {
    id: template.id.toString(),
    code: template.code,
    name: template.name,
    type: template.type,
    level: template.level,
    deliveryMode: template.deliveryMode,
    titleTemplate: template.titleTemplate,
    bodyTemplate: template.bodyTemplate,
    actionType: template.actionType,
    actionValueTemplate: template.actionValueTemplate,
    dedupeKeyTemplate: template.dedupeKeyTemplate,
    variables: parseVariableDeclarations(template.variables),
    enabled: template.enabled,
    usageCount: template._count?.notifications ?? 0,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

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
      const template = await prisma.notificationTemplate.findUnique({
        where: { id: BigInt(id) },
        include: { _count: { select: { notifications: true } } },
      });
      if (!template) return NextResponse.json({ error: "模板不存在" }, { status: 404 });
      return NextResponse.json(serializeTemplate(template));
    }

    const { page, pageSize } = parsePageParams(url.searchParams, { defaultPageSize: 20 });
    const keyword = url.searchParams.get("keyword")?.trim();
    const type = url.searchParams.get("type");
    const deliveryMode = url.searchParams.get("deliveryMode");
    const enabled = url.searchParams.get("enabled");

    const where: Record<string, unknown> = {};
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: "insensitive" } },
        { code: { contains: keyword, mode: "insensitive" } },
      ];
    }
    if (type) where.type = type;
    if (deliveryMode) where.deliveryMode = deliveryMode;
    if (enabled === "true" || enabled === "false") where.enabled = enabled === "true";

    const [items, total] = await Promise.all([
      prisma.notificationTemplate.findMany({
        where,
        orderBy: [{ id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { notifications: true } } },
      }),
      prisma.notificationTemplate.count({ where }),
    ]);

    return NextResponse.json({ items: items.map(serializeTemplate), total, page, pageSize });
  } catch (err) {
    return handleRouteError(err, "notification-templates GET");
  }
}

export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "notifications");
  if (admin instanceof NextResponse) return admin;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const draft = draftFromBody(body, code);
    if (!code) return NextResponse.json({ error: "模板编码不能为空" }, { status: 400 });
    const { variables } = validateTemplateDraft(draft);

    const template = await prisma.notificationTemplate.create({
      data: {
        code,
        name: draft.name,
        type: draft.type,
        level: draft.level,
        deliveryMode: draft.deliveryMode,
        titleTemplate: draft.titleTemplate,
        bodyTemplate: draft.bodyTemplate,
        actionType: draft.actionType,
        actionValueTemplate: draft.actionValueTemplate,
        dedupeKeyTemplate: draft.dedupeKeyTemplate,
        variables: variables as unknown as Prisma.InputJsonValue,
        enabled: draft.enabled !== false,
        createdBy: admin.id,
      },
    });
    return NextResponse.json({ id: template.id.toString() }, { status: 201 });
  } catch (err) {
    if (err instanceof NotificationError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: 422 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "模板编码已存在" }, { status: 409 });
    }
    return handleRouteError(err, "notification-templates POST");
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requirePermission(request, "notifications");
  if (admin instanceof NextResponse) return admin;

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const existing = await prisma.notificationTemplate.findUnique({ where: { id: BigInt(id) } });
    if (!existing) return NextResponse.json({ error: "模板不存在" }, { status: 404 });

    const body = (await request.json()) as Record<string, unknown>;
    // 编码创建后不可修改，始终沿用原值
    const draft = draftFromBody({ ...body, enabled: body.enabled ?? existing.enabled }, existing.code);
    const { variables } = validateTemplateDraft(draft);

    const template = await prisma.notificationTemplate.update({
      where: { id: existing.id },
      data: {
        name: draft.name,
        type: draft.type,
        level: draft.level,
        deliveryMode: draft.deliveryMode,
        titleTemplate: draft.titleTemplate,
        bodyTemplate: draft.bodyTemplate,
        actionType: draft.actionType,
        actionValueTemplate: draft.actionValueTemplate,
        dedupeKeyTemplate: draft.dedupeKeyTemplate,
        variables: variables as unknown as Prisma.InputJsonValue,
        enabled: draft.enabled !== false,
      },
    });
    return NextResponse.json({ id: template.id.toString() });
  } catch (err) {
    if (err instanceof NotificationError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: 422 });
    }
    return handleRouteError(err, "notification-templates PATCH");
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requirePermission(request, "notifications");
  if (admin instanceof NextResponse) return admin;

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const existing = await prisma.notificationTemplate.findUnique({ where: { id: BigInt(id) } });
    if (!existing) return NextResponse.json({ error: "模板不存在" }, { status: 404 });

    const used = await prisma.notification.count({ where: { templateId: BigInt(id) } });
    if (used > 0) {
      return NextResponse.json(
        { error: "模板已被消息引用，不能删除，只能停用" },
        { status: 409 },
      );
    }
    await prisma.notificationTemplate.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err, "notification-templates DELETE");
  }
}

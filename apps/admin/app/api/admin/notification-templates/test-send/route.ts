import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/middleware";
import {
  NotificationError,
  parseVariableDeclarations,
  renderNotification,
  resolveAutoFillValues,
  type VariableValues,
} from "@/lib/notification";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 测试发送：只发给指定 App 用户，标记 isTest 且 1 天后自动不可见。
 * 变量值 = 前端显式传入 + autoFill 从真实用户数据回填（前端没填的项）。
 */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "notifications");
  if (admin instanceof NextResponse) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const templateCode = typeof body.templateCode === "string" ? body.templateCode : "";
  const userId = typeof body.userId === "string" ? body.userId : "";
  const values =
    body.variables && typeof body.variables === "object" && !Array.isArray(body.variables)
      ? (body.variables as VariableValues)
      : {};

  if (!templateCode) return NextResponse.json({ error: "请选择模板" }, { status: 400 });
  if (!userId) return NextResponse.json({ error: "请选择测试用户" }, { status: 400 });

  const [template, user] = await Promise.all([
    prisma.notificationTemplate.findUnique({ where: { code: templateCode } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);
  if (!template) return NextResponse.json({ error: "模板不存在" }, { status: 404 });
  if (!template.enabled) return NextResponse.json({ error: "模板已停用" }, { status: 422 });
  if (!user) return NextResponse.json({ error: "测试用户不存在" }, { status: 404 });

  try {
    const rendered = await renderNotification(template, values, userId);
    const declarations = parseVariableDeclarations(template.variables);
    const resolved = await resolveAutoFillValues(declarations, userId, values);
    const expireAt = new Date(Date.now() + 24 * 3600 * 1000);

    const notification = await prisma.notification.create({
      data: {
        templateId: template.id,
        templateCode: template.code,
        type: template.type,
        level: template.level,
        title: `【测试】${rendered.title}`,
        body: rendered.body,
        actionType: template.actionType,
        actionValue: rendered.actionValue,
        deliveryMode: "event",
        userId,
        variables: resolved as unknown as Prisma.InputJsonValue,
        status: "published",
        publishedAt: new Date(),
        expireAt,
        isTest: true,
        createdBy: admin.id,
      },
    });

    return NextResponse.json(
      { id: notification.id.toString(), status: notification.status, isTest: true },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof NotificationError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: 422 });
    }
    console.error("[notification-templates test-send]", err);
    return NextResponse.json({ error: "测试发送失败" }, { status: 500 });
  }
}

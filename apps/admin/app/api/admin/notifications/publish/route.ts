import { requirePermission } from "@/lib/middleware";
import {
  NotificationError,
  publishBroadcast,
  type VariableValues,
} from "@/lib/notification";
import { NextRequest, NextResponse } from "next/server";

/** 按全站广播模板发布消息；变量只允许全局变量 */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "notifications");
  if (admin instanceof NextResponse) return admin;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const templateCode = typeof body.templateCode === "string" ? body.templateCode : "";
  const values =
    body.variables && typeof body.variables === "object" && !Array.isArray(body.variables)
      ? (body.variables as VariableValues)
      : {};
  const expireAt = typeof body.expireAt === "string" && body.expireAt ? new Date(body.expireAt) : null;

  if (!templateCode) return NextResponse.json({ error: "请选择模板" }, { status: 400 });
  if (expireAt && Number.isNaN(expireAt.getTime())) {
    return NextResponse.json({ error: "过期时间非法" }, { status: 400 });
  }

  try {
    const notification = await publishBroadcast({
      templateCode,
      variables: values,
      expireAt,
      createdBy: admin.id,
    });
    return NextResponse.json(
      {
        id: notification.id.toString(),
        status: notification.status,
        deliveryMode: notification.deliveryMode,
        publishedAt: notification.publishedAt,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof NotificationError) {
      return NextResponse.json({ error: err.message, details: err.details }, { status: 422 });
    }
    console.error("[notifications publish]", err);
    return NextResponse.json({ error: "发布失败" }, { status: 500 });
  }
}

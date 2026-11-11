import { requireAppUser } from "@/lib/middleware";
import { visibleNotificationWhere } from "@/lib/notification";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 消息详情：仅返回对当前用户可见的消息 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const item = await prisma.notification.findFirst({
    where: { AND: [{ id: BigInt(id) }, visibleNotificationWhere(appUser.id)] },
    include: { reads: { where: { userId: appUser.id }, select: { readAt: true } } },
  });
  if (!item) return NextResponse.json({ error: "消息不存在或已失效" }, { status: 404 });

  return NextResponse.json({
    id: item.id.toString(),
    type: item.type,
    level: item.level,
    title: item.title,
    body: item.body,
    actionType: item.actionType,
    actionValue: item.actionValue,
    publishedAt: item.publishedAt,
    readAt: item.reads[0]?.readAt ?? null,
    isRead: item.reads.length > 0,
  });
}

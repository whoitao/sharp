import { requireAppUser } from "@/lib/middleware";
import { visibleNotificationWhere } from "@/lib/notification";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 标记单条已读：幂等 upsert，重复点击不报错 */
export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id : "";
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const notification = await prisma.notification.findFirst({
    where: { AND: [{ id: BigInt(id) }, visibleNotificationWhere(appUser.id)] },
    select: { id: true },
  });
  if (!notification) return NextResponse.json({ error: "消息不存在或已失效" }, { status: 404 });

  const read = await prisma.notificationRead.upsert({
    where: {
      notificationId_userId: { notificationId: notification.id, userId: appUser.id },
    },
    update: {},
    create: { notificationId: notification.id, userId: appUser.id },
  });

  return NextResponse.json({ id: notification.id.toString(), readAt: read.readAt });
}

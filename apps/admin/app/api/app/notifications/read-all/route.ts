import { requireAppUser } from "@/lib/middleware";
import { visibleNotificationWhere } from "@/lib/notification";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 全部已读：只影响当前用户可见的未读消息 */
export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  const unread = await prisma.notification.findMany({
    where: {
      ...visibleNotificationWhere(appUser.id),
      reads: { none: { userId: appUser.id } },
    },
    select: { id: true },
  });

  if (unread.length > 0) {
    await prisma.notificationRead.createMany({
      data: unread.map((item) => ({ notificationId: item.id, userId: appUser.id })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ count: unread.length });
}

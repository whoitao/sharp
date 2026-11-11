import { requireAppUser } from "@/lib/middleware";
import { cleanupExpiredNotifications, visibleNotificationWhere } from "@/lib/notification";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/** 导航栏红点：只返回未读数，请求失败由前端静默沿用上次结果 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  void cleanupExpiredNotifications().catch(() => null);

  const count = await prisma.notification.count({
    where: {
      ...visibleNotificationWhere(appUser.id),
      reads: { none: { userId: appUser.id } },
    },
  });

  return NextResponse.json({ count });
}

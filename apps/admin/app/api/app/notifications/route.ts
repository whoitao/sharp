import { Prisma } from "@prisma/client";
import { requireAppUser } from "@/lib/middleware";
import {
  cleanupExpiredNotifications,
  generatePetHungryNotification,
  visibleNotificationWhere,
} from "@/lib/notification";
import { prisma } from "@/lib/prisma";
import { parsePageParams } from "@/lib/query";
import { NextRequest, NextResponse } from "next/server";

const READ_INCLUDE = (userId: string) => ({
  reads: { where: { userId }, select: { readAt: true } },
});

/** 用户消息列表：未读优先、发布时间倒序，附带未读总数 */
export async function GET(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  // 打开消息中心时顺便检查宠物饥饿提醒与过期清理，失败不影响列表
  await generatePetHungryNotification(appUser.id);
  void cleanupExpiredNotifications().catch(() => null);

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") === "unread" ? "unread" : "all";
  const { page, pageSize } = parsePageParams(url.searchParams, { defaultPageSize: 20 });
  const skip = (page - 1) * pageSize;

  const visible = visibleNotificationWhere(appUser.id);
  const unreadWhere = { ...visible, reads: { none: { userId: appUser.id } } } as const;
  const readWhere = { ...visible, reads: { some: { userId: appUser.id } } } as const;

  const [unreadCount, total] = await Promise.all([
    prisma.notification.count({ where: unreadWhere }),
    prisma.notification.count({ where: visible }),
  ]);

  let items: Prisma.NotificationGetPayload<{
    include: { reads: { select: { readAt: true } } };
  }>[];
  if (filter === "unread") {
    items = await prisma.notification.findMany({
      where: unreadWhere,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
      include: READ_INCLUDE(appUser.id),
    });
  } else {
    // 未读在前、已读在后：分页跨越两段时分别取，避免把页面内排序当成全局排序
    const unreadTake = Math.max(0, Math.min(pageSize, unreadCount - skip));
    const readSkip = Math.max(0, skip - unreadCount);
    const readTake = pageSize - unreadTake;

    const [unreadItems, readItems] = await Promise.all([
      unreadTake > 0
        ? prisma.notification.findMany({
            where: unreadWhere,
            orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
            skip,
            take: unreadTake,
            include: READ_INCLUDE(appUser.id),
          })
        : Promise.resolve([]),
      readTake > 0
        ? prisma.notification.findMany({
            where: readWhere,
            orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
            skip: readSkip,
            take: readTake,
            include: READ_INCLUDE(appUser.id),
          })
        : Promise.resolve([]),
    ]);
    items = [...unreadItems, ...readItems];
  }

  return NextResponse.json({
    items: items.map((item) => ({
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
    })),
    total: filter === "unread" ? unreadCount : total,
    page,
    pageSize,
    unreadCount,
  });
}

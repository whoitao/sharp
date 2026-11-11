import { prisma } from "../lib/prisma";
import {
  createEventNotification,
  publishBroadcast,
  visibleNotificationWhere,
} from "../lib/notification";

async function unreadCount(userId: string) {
  return prisma.notification.count({
    where: { ...visibleNotificationWhere(userId), reads: { none: { userId } } },
  });
}

async function main() {
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) {
    console.log("no user, skip");
    return;
  }
  const stamp = Date.now();
  const before = await unreadCount(user.id);

  const broadcast = await publishBroadcast({
    templateCode: "system_upgrade",
    variables: { version: `visibility-${stamp}`, content: "可见性验收" },
  });
  const event = await createEventNotification({
    templateCode: "pet_hungry",
    userId: user.id,
    variables: { pet_name: "验收猫", pet_id: "visibility", pet_satiety: 9, date: `v-${stamp}` },
  });

  const list = await prisma.notification.findMany({
    where: visibleNotificationWhere(user.id),
    select: { id: true, deliveryMode: true },
  });
  const visibleBroadcast = list.some((n) => n.id === broadcast.id);
  const visibleEvent = list.some((n) => n.id === event.id);
  const afterCreate = await unreadCount(user.id);

  await prisma.notificationRead.create({
    data: { notificationId: broadcast.id, userId: user.id },
  });
  const afterRead = await unreadCount(user.id);

  console.log({
    visibleBroadcast,
    visibleEvent,
    unreadBefore: before,
    unreadAfterCreate: afterCreate - before,
    unreadAfterRead: afterRead - before,
    listItemIsRead: list.length,
  });

  await prisma.notification.deleteMany({ where: { id: { in: [broadcast.id, event.id] } } });
  const final = await unreadCount(user.id);
  console.log("restored:", final === before);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

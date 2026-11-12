import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const templates: Prisma.NotificationTemplateCreateInput[] = [
  {
    code: "system_upgrade",
    name: "系统更新通知",
    type: "system",
    level: "info",
    deliveryMode: "broadcast",
    titleTemplate: "系统更新通知（{$version}）",
    bodyTemplate: "本次更新：{$content}",
    actionType: "none",
    variables: [
      {
        key: "version",
        label: "版本号",
        type: "string",
        scope: "global",
        required: true,
        example: "1.2.0",
      },
      {
        key: "content",
        label: "更新内容",
        type: "string",
        scope: "global",
        required: true,
        example: "新增消息中心，学习提醒不再错过",
      },
    ],
    enabled: true,
  },
  {
    code: "pet_hungry",
    name: "宠物饥饿提醒",
    type: "pet",
    level: "warning",
    deliveryMode: "event",
    titleTemplate: "{$pet_name} 饿了",
    bodyTemplate: "{$pet_name} 的饱食度已经降到 {$pet_satiety}，快去喂食吧。",
    actionType: "page",
    actionValueTemplate: "/account/pet",
    dedupeKeyTemplate: "pet_hungry:{$user_id}:{$pet_id}:{$date}",
    variables: [
      {
        key: "user_id",
        label: "用户 ID",
        type: "string",
        scope: "user",
        required: true,
        autoFill: "user.id",
      },
      {
        key: "pet_name",
        label: "宠物名称",
        type: "string",
        scope: "user",
        required: true,
        autoFill: "primaryPet.nickname",
        example: "奶酪",
      },
      {
        key: "pet_id",
        label: "宠物 ID",
        type: "string",
        scope: "user",
        required: true,
        autoFill: "primaryPet.id",
        example: "148",
      },
      {
        key: "pet_satiety",
        label: "饱食度",
        type: "number",
        scope: "user",
        required: false,
        autoFill: "primaryPet.satiety",
        fallback: "0",
      },
      {
        key: "date",
        label: "日期",
        type: "time",
        scope: "user",
        required: true,
        // 每次生成时取当天日期；不设静态 example，避免跨天后去重键停留在旧日期
        autoFill: "today",
      },
    ],
    enabled: true,
  },
];

async function main() {
  for (const template of templates) {
    const { code, ...data } = template;
    await prisma.notificationTemplate.upsert({
      where: { code: code as string },
      update: data,
      create: template,
    });
    console.log(`upserted template: ${code}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

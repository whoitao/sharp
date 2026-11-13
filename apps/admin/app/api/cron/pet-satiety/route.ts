import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applySatietyDecay, getPetConfig, settleSatietyDecay, stateOf } from "@/lib/pet";
import { generatePetHungryNotification } from "@/lib/notification";

export const dynamic = "force-dynamic";
// 当前规模（个位数宠物）远低于此；留足余量，宠物量增长后可再调小。
export const maxDuration = 60;

const BATCH_SIZE = 100;
const DETAIL_LIMIT = 100;

type SkipReason = "asleep" | "active" | "normal" | "templateDisabled";

interface ItemDetail {
  petId: string;
  userId: string;
  settledHours: number;
  satiety: number;
  state: string;
  notification: "created" | "deduped" | "skipped" | "failed";
}

function unauthorized() {
  return NextResponse.json(
    { error: "UNAUTHORIZED", message: "缺少或错误的 CRON_SECRET" },
    { status: 401 },
  );
}

/**
 * 宠物饱腹度定时结算 + 饥饿提醒。
 *
 * 鉴权：Vercel Cron 会带 `Authorization: Bearer <CRON_SECRET>`；未配置 CRON_SECRET 时一律 401。
 * 调度：vercel.json 中为 `30 20 * * *`（UTC），即北京时间每天 04:30。
 * 幂等：applySatietyDecay 只在「存在完整小时」时写库，同一小时内重复执行不会重复扣减；
 *       通知沿用 pet_hungry 的每日去重键，重复执行不会重复生成。
 * 时段：提醒时段是 PetConfig 配置项（当前 04:00–22:00），04:30 在窗口内，无需绕过；
 *       判定按北京时间小时（beijingHour），不依赖服务器时区。
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return unauthorized();
  }

  const startedAt = Date.now();
  const runStart = new Date(startedAt);
  const withDetails = new URL(req.url).searchParams.get("details") === "1";

  const summary = {
    scanned: 0,
    settled: 0,
    settledHours: 0,
    notified: 0,
    deduped: 0,
    skipped: { asleep: 0, active: 0, normal: 0, templateDisabled: 0 } as Record<SkipReason, number>,
    failed: 0,
    durationMs: 0,
  };
  const errors: { petId: string; message: string }[] = [];
  const items: ItemDetail[] = [];

  try {
    const config = await getPetConfig();
    let cursor: string | undefined;

    while (true) {
      const links = await prisma.userPet.findMany({
        where: { isPrimary: true },
        include: { pet: true },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (links.length === 0) break;

      for (const link of links) {
        summary.scanned++;
        const pet = link.pet;

        let settledPet = pet;
        let settledHours = 0;
        try {
          const plan = settleSatietyDecay(pet, config, runStart);
          settledHours = plan.settledHours;
          if (settledHours > 0) {
            settledPet = await applySatietyDecay(pet, config, runStart);
            summary.settled++;
            summary.settledHours += settledHours;
          }
        } catch (err) {
          summary.failed++;
          errors.push({ petId: pet.id, message: err instanceof Error ? err.message : String(err) });
          continue;
        }

        const state = stateOf(settledPet.satiety, settledPet.lastFedAt, config, runStart);
        let outcome: ItemDetail["notification"] = "skipped";

        if (state === "asleep") {
          // 睡着不发饥饿消息：与页面/消息中心的生成规则保持一致
          summary.skipped.asleep++;
        } else if (state !== "hungry") {
          if (state === "active") summary.skipped.active++;
          else summary.skipped.normal++;
        } else {
          try {
            const notification = await generatePetHungryNotification(link.userId, {
              throwOnError: true,
            });
            if (!notification) {
              summary.skipped.templateDisabled++;
            } else if (notification.createdAt.getTime() >= runStart.getTime()) {
              summary.notified++;
              outcome = "created";
            } else {
              summary.deduped++;
              outcome = "deduped";
            }
          } catch (err) {
            summary.failed++;
            outcome = "failed";
            errors.push({ petId: pet.id, message: err instanceof Error ? err.message : String(err) });
          }
        }

        if (withDetails && items.length < DETAIL_LIMIT) {
          items.push({
            petId: pet.id,
            userId: link.userId,
            settledHours,
            satiety: settledPet.satiety,
            state,
            notification: outcome,
          });
        }
      }

      cursor = links[links.length - 1].id;
      if (links.length < BATCH_SIZE) break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    summary.durationMs = Date.now() - startedAt;
    console.error("[cron] pet-satiety 执行失败", { message, summary });
    return NextResponse.json(
      { error: "CRON_FAILED", message, summary, errors },
      { status: 500 },
    );
  }

  summary.durationMs = Date.now() - startedAt;
  console.log("[cron] pet-satiety 完成", JSON.stringify(summary));

  const payload = { summary, ...(withDetails ? { items } : {}) };
  if (summary.failed > 0) {
    return NextResponse.json({ ...payload, errors }, { status: 500 });
  }
  return NextResponse.json(payload);
}

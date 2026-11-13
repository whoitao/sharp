import { handleRouteError } from "@/lib/http";
import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import {
  SITE_SETTING_ID,
  getOrCreateSiteSetting,
  notifyWebRevalidate,
  toSnapshot,
  trimRevisions,
} from "@/lib/site-settings";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/** 空字符串统一转 null，避免前端清空后存成 "" */
const nullableText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

const siteUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .max(300)
    .refine((value) => /^https?:\/\/[^\s]+$/i.test(value), "siteUrl must start with http(s)://")
    .nullable()
    .optional(),
);

const gaSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .regex(/^G-[A-Z0-9]{6,}$/, "invalid GA4 measurement id")
    .nullable()
    .optional(),
);

const updateSchema = z.object({
  siteNameZh: z.string().trim().min(1).max(60).optional(),
  siteNameEn: z.string().trim().min(1).max(60).optional(),
  sloganZh: nullableText(200),
  sloganEn: nullableText(200),
  siteUrl: siteUrlSchema,
  seoTitleZh: nullableText(200),
  seoTitleEn: nullableText(200),
  seoDescriptionZh: nullableText(500),
  seoDescriptionEn: nullableText(500),
  seoKeywordsZh: nullableText(500),
  seoKeywordsEn: nullableText(500),
  gaMeasurementId: gaSchema,
  analyticsProductionOnly: z.boolean().optional(),
  icpNumber: nullableText(100),
  maintenanceEnabled: z.boolean().optional(),
  maintenanceMessageZh: nullableText(500),
  maintenanceMessageEn: nullableText(500),
});

/** 读取站点设置，不存在时按默认值创建 */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "settings");
  if (admin instanceof NextResponse) return admin;

  try {
    const row = await getOrCreateSiteSetting();
    return NextResponse.json(row);
  } catch (err) {
    return handleRouteError(err, "site-settings GET");
  }
}

/** 保存站点设置：写整行快照，裁剪到最近 20 条，并通知 Web 刷新缓存 */
export async function PUT(request: NextRequest) {
  const admin = await requirePermission(request, "settings");
  if (admin instanceof NextResponse) return admin;

  try {
    const body = await request.json().catch(() => null);
    const parsed = updateSchema.parse(body ?? {});
    const data = { ...parsed, updatedBy: admin.username };

    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.siteSetting.upsert({
        where: { id: SITE_SETTING_ID },
        update: data,
        create: { id: SITE_SETTING_ID, ...data },
      });
      await tx.siteSettingRevision.create({
        data: {
          settingId: SITE_SETTING_ID,
          snapshot: toSnapshot(updated),
          changedBy: admin.username,
        },
      });
      return updated;
    });

    await trimRevisions(SITE_SETTING_ID);
    const revalidated = await notifyWebRevalidate();

    return NextResponse.json({ ...row, revalidated });
  } catch (err) {
    return handleRouteError(err, "site-settings PUT");
  }
}

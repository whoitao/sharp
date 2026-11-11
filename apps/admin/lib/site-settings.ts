import { prisma } from "@/lib/prisma";
import type { SiteSetting } from "@prisma/client";

export const SITE_SETTING_ID = "default";
/** 保留最近 20 条快照 */
export const REVISION_LIMIT = 20;

/** 读取单行配置，不存在时按默认值创建 */
export function getOrCreateSiteSetting(): Promise<SiteSetting> {
  return prisma.siteSetting.upsert({
    where: { id: SITE_SETTING_ID },
    update: {},
    create: { id: SITE_SETTING_ID },
  });
}

/**
 * 快照只保留业务字段与修改信息，避免把关系字段写进 JSON。
 * 恢复时按这份结构回填，日期只做展示，不再写回。
 */
export function toSnapshot(row: SiteSetting) {
  return {
    siteNameZh: row.siteNameZh,
    siteNameEn: row.siteNameEn,
    sloganZh: row.sloganZh,
    sloganEn: row.sloganEn,
    siteUrl: row.siteUrl,
    seoTitleZh: row.seoTitleZh,
    seoTitleEn: row.seoTitleEn,
    seoDescriptionZh: row.seoDescriptionZh,
    seoDescriptionEn: row.seoDescriptionEn,
    gaMeasurementId: row.gaMeasurementId,
    analyticsProductionOnly: row.analyticsProductionOnly,
    icpNumber: row.icpNumber,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}

/** 快照结构（与 toSnapshot 保持一致） */
export interface SiteSettingSnapshot {
  siteNameZh: string;
  siteNameEn: string;
  sloganZh: string | null;
  sloganEn: string | null;
  siteUrl: string | null;
  seoTitleZh: string | null;
  seoTitleEn: string | null;
  seoDescriptionZh: string | null;
  seoDescriptionEn: string | null;
  gaMeasurementId: string | null;
  analyticsProductionOnly: boolean;
  icpNumber: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

/** 恢复快照时只回填业务字段，忽略 updatedAt / updatedBy */
export function snapshotToUpdateData(snapshot: SiteSettingSnapshot) {
  return {
    siteNameZh: snapshot.siteNameZh,
    siteNameEn: snapshot.siteNameEn,
    sloganZh: snapshot.sloganZh,
    sloganEn: snapshot.sloganEn,
    siteUrl: snapshot.siteUrl,
    seoTitleZh: snapshot.seoTitleZh,
    seoTitleEn: snapshot.seoTitleEn,
    seoDescriptionZh: snapshot.seoDescriptionZh,
    seoDescriptionEn: snapshot.seoDescriptionEn,
    gaMeasurementId: snapshot.gaMeasurementId,
    analyticsProductionOnly: snapshot.analyticsProductionOnly,
    icpNumber: snapshot.icpNumber,
  };
}

/** 只保留最近 20 条，避免快照无限增长 */
export async function trimRevisions(settingId: string): Promise<void> {
  const stale = await prisma.siteSettingRevision.findMany({
    where: { settingId },
    orderBy: { createdAt: "desc" },
    skip: REVISION_LIMIT,
    select: { id: true },
  });
  if (stale.length === 0) return;
  await prisma.siteSettingRevision.deleteMany({
    where: { id: { in: stale.map((item) => item.id) } },
  });
}

/** 保存成功后通知 Web 刷新 site-settings 缓存；未配置或失败时静默降级 */
export async function notifyWebRevalidate(): Promise<boolean> {
  const base = process.env.WEB_REVALIDATE_URL?.replace(/\/+$/, "");
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret) return false;
  try {
    const res = await fetch(`${base}/api/revalidate?tag=site-settings`, {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

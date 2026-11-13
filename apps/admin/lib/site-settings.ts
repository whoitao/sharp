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
    seoKeywordsZh: row.seoKeywordsZh,
    seoKeywordsEn: row.seoKeywordsEn,
    gaMeasurementId: row.gaMeasurementId,
    analyticsProductionOnly: row.analyticsProductionOnly,
    icpNumber: row.icpNumber,
    maintenanceEnabled: row.maintenanceEnabled,
    maintenanceMessageZh: row.maintenanceMessageZh,
    maintenanceMessageEn: row.maintenanceMessageEn,
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
  /** 旧快照没有这两个字段；恢复时 undefined 会被 Prisma 忽略，保留当前值 */
  seoKeywordsZh?: string | null;
  seoKeywordsEn?: string | null;
  gaMeasurementId: string | null;
  analyticsProductionOnly: boolean;
  icpNumber: string | null;
  /** 旧快照没有这三个字段；恢复时 undefined 会被 Prisma 忽略，保留当前值 */
  maintenanceEnabled?: boolean;
  maintenanceMessageZh?: string | null;
  maintenanceMessageEn?: string | null;
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
    seoKeywordsZh: snapshot.seoKeywordsZh,
    seoKeywordsEn: snapshot.seoKeywordsEn,
    gaMeasurementId: snapshot.gaMeasurementId,
    analyticsProductionOnly: snapshot.analyticsProductionOnly,
    icpNumber: snapshot.icpNumber,
    maintenanceEnabled: snapshot.maintenanceEnabled,
    maintenanceMessageZh: snapshot.maintenanceMessageZh,
    maintenanceMessageEn: snapshot.maintenanceMessageEn,
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

/**
 * 保存成功后通知 Web 刷新 site-settings 缓存。
 * 失败不会阻断保存，但会写日志，便于从 Vercel Logs 判断「保存了却没生效」是不是这里的问题。
 */
export async function notifyWebRevalidate(): Promise<boolean> {
  const base = process.env.WEB_REVALIDATE_URL?.replace(/\/+$/, "");
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret) {
    console.warn(
      "[site-settings] WEB_REVALIDATE_URL 或 REVALIDATE_SECRET 未配置，跳过 Web 缓存失效（最多 5 分钟自然过期）",
    );
    return false;
  }
  try {
    const res = await fetch(`${base}/api/revalidate?tag=site-settings`, {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.warn(
        `[site-settings] Web 缓存失效失败：${base}/api/revalidate 返回 ${res.status}`,
      );
    }
    return res.ok;
  } catch (err) {
    console.warn(`[site-settings] Web 缓存失效请求异常：${base}/api/revalidate`, err);
    return false;
  }
}

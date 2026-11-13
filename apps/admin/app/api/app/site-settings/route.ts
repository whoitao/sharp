import { getOrCreateSiteSetting } from "@/lib/site-settings";
import { NextResponse } from "next/server";

/**
 * Web / 移动端只读站点配置。
 * 只返回白名单字段，不暴露 updatedBy、快照等后台信息。
 */
export async function GET() {
  try {
    const row = await getOrCreateSiteSetting();

    return NextResponse.json(
      {
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
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (err) {
    console.error("[app/site-settings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

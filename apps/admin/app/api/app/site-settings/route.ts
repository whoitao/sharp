import { getOrCreateSiteSetting, withAssetUrls } from "@/lib/site-settings";
import { NextResponse } from "next/server";

/**
 * Web / 移动端只读站点配置。
 * 只返回白名单字段，不暴露 updatedBy、快照等后台信息。
 */
export async function GET() {
  try {
    const row = await getOrCreateSiteSetting();
    const data = withAssetUrls(row);

    return NextResponse.json(
      {
        siteNameZh: data.siteNameZh,
        siteNameEn: data.siteNameEn,
        sloganZh: data.sloganZh,
        sloganEn: data.sloganEn,
        logoUrl: data.logoUrl,
        faviconUrl: data.faviconUrl,
        ogImageUrl: data.ogImageUrl,
        siteUrl: data.siteUrl,
        seoTitleZh: data.seoTitleZh,
        seoTitleEn: data.seoTitleEn,
        seoDescriptionZh: data.seoDescriptionZh,
        seoDescriptionEn: data.seoDescriptionEn,
        gaMeasurementId: data.gaMeasurementId,
        analyticsProductionOnly: data.analyticsProductionOnly,
        icpNumber: data.icpNumber,
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

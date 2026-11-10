import { handleRouteError } from "@/lib/http";
import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { REVISION_LIMIT, SITE_SETTING_ID } from "@/lib/site-settings";
import { NextRequest, NextResponse } from "next/server";

/** 最近 20 条变更快照（BigInt 主键转字符串，避免 JSON 序列化失败） */
export async function GET(request: NextRequest) {
  const admin = await requirePermission(request, "settings");
  if (admin instanceof NextResponse) return admin;

  try {
    const revisions = await prisma.siteSettingRevision.findMany({
      where: { settingId: SITE_SETTING_ID },
      orderBy: { createdAt: "desc" },
      take: REVISION_LIMIT,
      select: { id: true, changedBy: true, createdAt: true, snapshot: true },
    });

    return NextResponse.json({
      items: revisions.map((item) => ({
        id: String(item.id),
        changedBy: item.changedBy,
        createdAt: item.createdAt,
        snapshot: item.snapshot,
      })),
    });
  } catch (err) {
    return handleRouteError(err, "site-settings revisions GET");
  }
}

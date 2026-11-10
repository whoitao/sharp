import { handleRouteError } from "@/lib/http";
import { requirePermission } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import {
  SITE_SETTING_ID,
  notifyWebRevalidate,
  snapshotToUpdateData,
  toSnapshot,
  trimRevisions,
  withAssetUrls,
  type SiteSettingSnapshot,
} from "@/lib/site-settings";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/** 恢复指定快照：回填业务字段，并把恢复后的整行再记一条新快照 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const admin = await requirePermission(request, "settings");
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  let revisionId: bigint;
  try {
    revisionId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "invalid revision id" }, { status: 400 });
  }

  try {
    const revision = await prisma.siteSettingRevision.findFirst({
      where: { id: revisionId, settingId: SITE_SETTING_ID },
    });
    if (!revision) {
      return NextResponse.json({ error: "revision not found" }, { status: 404 });
    }

    const snapshot = revision.snapshot as unknown as SiteSettingSnapshot;
    if (typeof snapshot?.siteNameZh !== "string" || typeof snapshot?.siteNameEn !== "string") {
      return NextResponse.json({ error: "invalid snapshot" }, { status: 400 });
    }

    const data = { ...snapshotToUpdateData(snapshot), updatedBy: admin.username };
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

    return NextResponse.json({ ...withAssetUrls(row), revalidated });
  } catch (err) {
    return handleRouteError(err, "site-settings restore");
  }
}

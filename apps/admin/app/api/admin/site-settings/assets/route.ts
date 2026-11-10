import { requirePermission } from "@/lib/middleware";
import { SiteAssetValidationError, normalizeSiteAsset } from "@/lib/site-assets";
import {
  MAX_SITE_FAVICON_BYTES,
  MAX_SITE_LOGO_BYTES,
  MAX_SITE_OG_BYTES,
  StorageConfigError,
  StorageUploadError,
  detectImageType,
  uploadSiteAsset,
  type SiteAssetKind,
} from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

const KIND_LIMITS: Record<SiteAssetKind, number> = {
  logo: MAX_SITE_LOGO_BYTES,
  favicon: MAX_SITE_FAVICON_BYTES,
  og: MAX_SITE_OG_BYTES,
};

function isSiteAssetKind(value: unknown): value is SiteAssetKind {
  return value === "logo" || value === "favicon" || value === "og";
}

/** 上传站点素材：multipart/form-data，字段 file + kind(logo|favicon|og) */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "settings");
  if (admin instanceof NextResponse) return admin;

  const form = await request.formData().catch(() => null);
  const kind = form?.get("kind");
  if (!isSiteAssetKind(kind)) {
    return NextResponse.json({ error: "kind must be logo, favicon or og" }, { status: 400 });
  }

  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "multipart/form-data with a 'file' field is required" },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "file is empty" }, { status: 400 });
  }
  if (file.size > KIND_LIMITS[kind]) {
    return NextResponse.json(
      { error: `image must be smaller than ${Math.round(KIND_LIMITS[kind] / 1024 / 1024)}MB` },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectImageType(bytes);
  if (!contentType) {
    return NextResponse.json(
      { error: "only jpeg, png or webp images are allowed" },
      { status: 415 },
    );
  }

  try {
    const normalized = await normalizeSiteAsset(bytes, kind);
    const result = await uploadSiteAsset(normalized.bytes, normalized.contentType, kind);
    return NextResponse.json({ path: result.objectPath, url: result.url });
  } catch (err) {
    if (err instanceof SiteAssetValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof StorageConfigError) {
      console.error("[site-assets]", err.message);
      return NextResponse.json({ error: "storage is not configured" }, { status: 500 });
    }
    if (err instanceof StorageUploadError) {
      console.error("[site-assets] storage error", err.message);
      return NextResponse.json({ error: "image upload failed" }, { status: 502 });
    }
    console.error("[site-assets] unexpected upload error", err);
    return NextResponse.json({ error: "image upload failed" }, { status: 502 });
  }
}

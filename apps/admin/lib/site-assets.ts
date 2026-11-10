import sharp from "sharp";
import type { ImageContentType, SiteAssetKind } from "@/lib/storage";

/** 站点素材处理失败（尺寸/比例/解码异常），由上传接口转成 400 */
export class SiteAssetValidationError extends Error {}

const MAX_LOGO_EDGE = 512;
const FAVICON_SIZE = 180;
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/**
 * 站点素材统一在服务端处理：
 * - logo：保留比例，最长边限制 512px，拒绝极端比例
 * - favicon：居中裁成 1:1，输出 180×180 PNG
 * - og：裁成 1200×630，输出 WebP
 */
export async function normalizeSiteAsset(
  bytes: Uint8Array,
  kind: SiteAssetKind,
): Promise<{ bytes: Uint8Array; contentType: ImageContentType }> {
  try {
    if (kind === "logo") {
      const { width, height } = await sharp(bytes).metadata();
      if (!width || !height) throw new SiteAssetValidationError("cannot read image size");
      const ratio = width / height;
      if (ratio > 5 || ratio < 1 / 5) {
        throw new SiteAssetValidationError("logo aspect ratio must be between 1:5 and 5:1");
      }
      const output = await sharp(bytes)
        .resize({ width: MAX_LOGO_EDGE, height: MAX_LOGO_EDGE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();
      return { bytes: new Uint8Array(output), contentType: "image/webp" };
    }

    if (kind === "favicon") {
      const output = await sharp(bytes)
        .resize({ width: FAVICON_SIZE, height: FAVICON_SIZE, fit: "cover", position: "center" })
        .png()
        .toBuffer();
      return { bytes: new Uint8Array(output), contentType: "image/png" };
    }

    const output = await sharp(bytes)
      .resize({ width: OG_WIDTH, height: OG_HEIGHT, fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
    return { bytes: new Uint8Array(output), contentType: "image/webp" };
  } catch (err) {
    if (err instanceof SiteAssetValidationError) throw err;
    throw new SiteAssetValidationError(
      err instanceof Error ? err.message : "image could not be processed",
    );
  }
}

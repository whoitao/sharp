import sharp from "sharp";
import type { ImageContentType } from "@/lib/storage";

/** 教材封面：竖版 3:4，宽度上限 900px */
const MAX_COVER_WIDTH = 900;
/** 教材封面输出上限：100KB */
const MAX_COVER_BYTES = 100 * 1024;

/**
 * 统一处理教材封面：裁成 3:4、转 WebP，并保证输出不超过 100KB。
 * 先降质量，仍超标再逐步缩小宽度；处理失败时退回原图，不阻塞上传。
 */
export async function normalizeTextbookCover(
  bytes: Uint8Array,
  contentType: ImageContentType,
): Promise<{ bytes: Uint8Array; contentType: ImageContentType }> {
  try {
    const { width, height } = await sharp(bytes).metadata();
    if (!width || !height) return { bytes, contentType };

    let targetWidth = Math.min(width, MAX_COVER_WIDTH);
    let smallest: Buffer | null = null;

    while (true) {
      for (const quality of [85, 75, 65, 55, 45]) {
        const output = await sharp(bytes)
          .resize({
            width: targetWidth,
            height: Math.round((targetWidth * 4) / 3),
            fit: "cover",
            position: "attention",
          })
          .webp({ quality })
          .toBuffer();
        smallest = output;
        if (output.length <= MAX_COVER_BYTES) {
          return { bytes: new Uint8Array(output), contentType: "image/webp" };
        }
      }
      if (targetWidth <= 320) break;
      targetWidth = Math.round(targetWidth * 0.8);
    }

    return { bytes: new Uint8Array(smallest!), contentType: "image/webp" };
  } catch (err) {
    console.warn("[textbook-cover] normalize failed, fallback to original", err);
    return { bytes, contentType };
  }
}

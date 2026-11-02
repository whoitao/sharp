import sharp from "sharp";
import type { ImageContentType } from "@/lib/storage";

/** 教材封面宽度上限 600px：列表里只显示几十像素，600px 足够且更容易压到 20KB */
const MAX_COVER_WIDTH = 600;
/** 教材封面输出上限：20KB */
const MAX_COVER_BYTES = 20 * 1024;
/** 宽度下限：再小封面上的书名就看不清了 */
const MIN_COVER_WIDTH = 220;
/** 质量档位：从清晰到极限压缩，逐档试到命中 20KB */
const QUALITY_STEPS = [85, 75, 65, 55, 45, 38, 32, 28, 24];

/**
 * 统一处理教材封面：裁成 3:4、转 WebP，并保证输出不超过 20KB。
 * 每个宽度先逐档降质量，仍超标再缩小宽度；处理失败时退回原图，不阻塞上传。
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
      for (const quality of QUALITY_STEPS) {
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
      if (targetWidth <= MIN_COVER_WIDTH) break;
      targetWidth = Math.max(MIN_COVER_WIDTH, Math.round(targetWidth * 0.85));
    }

    return { bytes: new Uint8Array(smallest!), contentType: "image/webp" };
  } catch (err) {
    console.warn("[textbook-cover] normalize failed, fallback to original", err);
    return { bytes, contentType };
  }
}

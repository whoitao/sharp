import { requireAdmin } from "@/lib/middleware";
import {
  MAX_TEXTBOOK_COVER_BYTES,
  StorageConfigError,
  StorageUploadError,
  detectImageType,
  uploadTextbookCover,
  type ImageContentType,
} from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

/** 教材封面：竖版 3:4，统一转 WebP，并保证输出不超过 100KB */
const MAX_COVER_WIDTH = 900;
const MAX_COVER_BYTES = 100 * 1024;

async function normalizeCover(bytes: Uint8Array, contentType: ImageContentType) {
  try {
    const image = sharp(bytes);
    const { width, height } = await image.metadata();
    if (!width || !height) return { bytes, contentType };

    const baseWidth = Math.min(width, MAX_COVER_WIDTH);
    let targetWidth = baseWidth;
    let smallest: Buffer | null = null;

    // 先降质量，仍超标再逐步缩小宽度，确保最终封面控制在 100KB 以内
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
          return { bytes: new Uint8Array(output), contentType: "image/webp" as ImageContentType };
        }
      }
      if (targetWidth <= 320) break;
      targetWidth = Math.round(targetWidth * 0.8);
    }

    return {
      bytes: new Uint8Array(smallest!),
      contentType: "image/webp" as ImageContentType,
    };
  } catch (err) {
    // 处理失败不阻塞上传，退回原图
    console.warn("[textbook-cover] normalize failed, fallback to original", err);
    return { bytes, contentType };
  }
}

/** 上传教材封面：multipart/form-data，字段名 file */
export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  let form: FormData | null = null;
  try {
    form = await request.formData();
  } catch {
    form = null;
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
  if (file.size > MAX_TEXTBOOK_COVER_BYTES) {
    return NextResponse.json(
      { error: `image must be smaller than ${MAX_TEXTBOOK_COVER_BYTES / 1024 / 1024}MB` },
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
    const normalized = await normalizeCover(bytes, contentType);
    const result = await uploadTextbookCover(normalized.bytes, normalized.contentType);
    return NextResponse.json({ path: result.objectPath, url: result.url });
  } catch (err) {
    if (err instanceof StorageConfigError) {
      console.error("[textbook-cover]", err.message);
      return NextResponse.json({ error: "storage is not configured" }, { status: 500 });
    }
    if (err instanceof StorageUploadError) {
      console.error("[textbook-cover] storage error", err.message);
      return NextResponse.json({ error: "image upload failed" }, { status: 502 });
    }
    console.error("[textbook-cover] unexpected upload error", err);
    return NextResponse.json({ error: "image upload failed" }, { status: 502 });
  }
}

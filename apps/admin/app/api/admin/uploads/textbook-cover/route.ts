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

/** 教材封面：竖版 3:4，宽度上限 900px，统一转 WebP q85 */
const MAX_COVER_WIDTH = 900;

async function normalizeCover(bytes: Uint8Array, contentType: ImageContentType) {
  try {
    const image = sharp(bytes);
    const { width, height } = await image.metadata();
    if (!width || !height) return { bytes, contentType };

    const targetWidth = Math.min(width, MAX_COVER_WIDTH);
    const targetHeight = Math.round((targetWidth * 4) / 3);
    const output = await image
      .resize({ width: targetWidth, height: targetHeight, fit: "cover", position: "attention" })
      .webp({ quality: 85 })
      .toBuffer();
    return { bytes: new Uint8Array(output), contentType: "image/webp" as ImageContentType };
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

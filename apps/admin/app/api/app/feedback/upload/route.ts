import { requireAppUser } from "@/lib/middleware";
import { checkLimit, recordFailure } from "@/lib/rate-limit";
import {
  MAX_FEEDBACK_IMAGE_BYTES,
  StorageConfigError,
  StorageUploadError,
  detectImageType,
  uploadFeedbackImage,
  type ImageContentType,
} from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

/** 长边上限：与题图一致，正文里 1600px 足够看清截图细节 */
const MAX_IMAGE_EDGE = 1600;

async function shrinkImage(
  bytes: Uint8Array,
  contentType: ImageContentType,
): Promise<{ bytes: Uint8Array; contentType: ImageContentType }> {
  try {
    const image = sharp(bytes);
    const meta = await image.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height || Math.max(width, height) <= MAX_IMAGE_EDGE) {
      return { bytes, contentType };
    }
    const shrunk = await image
      .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: "inside" })
      .webp({ quality: 85 })
      .toBuffer();
    return { bytes: new Uint8Array(shrunk), contentType: "image/webp" };
  } catch (err) {
    console.warn("[feedback-upload] shrink failed, fallback to original", err);
    return { bytes, contentType };
  }
}

/**
 * 反馈正文图片上传：multipart/form-data，字段名 file。
 * 只认文件头；图片落在 feedback/{userId}/ 下，提交时按该前缀复核归属。
 */
export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

  // 1 小时最多 30 张，避免被当成图床
  const limit = checkLimit(`feedback:upload:${appUser.id}`, 30, 3600_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "上传过于频繁，请稍后再试", retryAfter: limit.retryAfterSeconds },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let form: FormData | null = null;
  try {
    form = await request.formData();
  } catch {
    form = null;
  }

  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "multipart/form-data with a 'file' field is required" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "file is empty" }, { status: 400 });
  }
  if (file.size > MAX_FEEDBACK_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `image must be smaller than ${MAX_FEEDBACK_IMAGE_BYTES / 1024 / 1024}MB` },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectImageType(bytes);
  if (!contentType) {
    return NextResponse.json({ error: "only jpeg, png or webp images are allowed" }, { status: 415 });
  }

  try {
    const shrunk = await shrinkImage(bytes, contentType);
    const result = await uploadFeedbackImage(appUser.id, shrunk.bytes, shrunk.contentType);
    recordFailure(`feedback:upload:${appUser.id}`, 3600_000);
    return NextResponse.json({ path: result.objectPath, url: result.url });
  } catch (err) {
    if (err instanceof StorageConfigError) {
      console.error("[feedback-upload]", err.message);
      return NextResponse.json({ error: "storage is not configured" }, { status: 500 });
    }
    if (err instanceof StorageUploadError) {
      console.error("[feedback-upload] storage error", err.message);
      return NextResponse.json({ error: "image upload failed" }, { status: 502 });
    }
    console.error("[feedback-upload] unexpected upload error", err);
    return NextResponse.json({ error: "image upload failed" }, { status: 502 });
  }
}

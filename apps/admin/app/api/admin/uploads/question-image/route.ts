import { requirePermission } from "@/lib/middleware";
import {
    MAX_QUESTION_IMAGE_BYTES,
    StorageConfigError,
    StorageUploadError,
    detectImageType,
    uploadQuestionImage,
    type ImageContentType
} from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

/** 题图最长边最大 800px，最终文件不得超过 10KB。 */
const MAX_IMAGE_BYTES = 10 * 1024;

class QuestionImageCompressionError extends Error {}

/** 统一输出 WebP，逐级降低尺寸和质量，确保题图不超过 10KB。 */
async function shrinkImage(
  bytes: Uint8Array
): Promise<{ bytes: Uint8Array; contentType: ImageContentType }> {
  try {
    for (const dimension of [800, 512, 320, 192, 128, 64, 32]) {
      for (const quality of [72, 52, 32, 16]) {
        const output = await sharp(bytes, { limitInputPixels: 40_000_000 })
          .rotate()
          .resize({ width: dimension, height: dimension, fit: "inside", withoutEnlargement: true })
          .webp({ quality, effort: 6 })
          .toBuffer();
        if (output.byteLength <= MAX_IMAGE_BYTES) {
          return { bytes: new Uint8Array(output), contentType: "image/webp" };
        }
      }
    }
  } catch (err) {
    throw new QuestionImageCompressionError(err instanceof Error ? err.message : "image decoding failed");
  }
  throw new QuestionImageCompressionError("image cannot be compressed to 10KB");
}

/**
 * 上传题目图片（题干/选项/解析里插入的图）：multipart/form-data，字段名 file。
 * 校验文件头而不是客户端声明的 Content-Type，避免伪造类型上传脚本。
 * 返回相对路径和完整 URL，编辑器直接拿 URL 插入 <img>。
 */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "questions");
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
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "file is empty" }, { status: 400 });
  }
  if (file.size > MAX_QUESTION_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `image must be smaller than ${MAX_QUESTION_IMAGE_BYTES / 1024 / 1024}MB` },
      { status: 413 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectImageType(bytes);
  if (!contentType) {
    return NextResponse.json(
      { error: "only jpeg, png or webp images are allowed" },
      { status: 415 }
    );
  }

  try {
    const shrunk = await shrinkImage(bytes);
    const result = await uploadQuestionImage(shrunk.bytes, shrunk.contentType);
    return NextResponse.json({ path: result.objectPath, url: result.url });
  } catch (err) {
    if (err instanceof QuestionImageCompressionError) {
      console.error("[question-image] compression error", err.message);
      return NextResponse.json({ error: "image must be compressible to 10KB" }, { status: 422 });
    }
    if (err instanceof StorageConfigError) {
      console.error("[question-image]", err.message);
      return NextResponse.json({ error: "storage is not configured" }, { status: 500 });
    }
    if (err instanceof StorageUploadError) {
      console.error("[question-image] storage error", err.message);
      return NextResponse.json({ error: "image upload failed" }, { status: 502 });
    }
    console.error("[question-image] unexpected upload error", err);
    return NextResponse.json({ error: "image upload failed" }, { status: 502 });
  }
}

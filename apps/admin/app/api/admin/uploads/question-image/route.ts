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

/** 服务端压缩：宽度超过 800px 的题图等比缩到 800 并统一转 webp；
 *  移动端题目展示区域不足 400px 宽，800 已留足 2x 屏余量 */
const MAX_IMAGE_WIDTH = 800;

async function shrinkImage(
  bytes: Uint8Array,
  contentType: ImageContentType
): Promise<{ bytes: Uint8Array; contentType: ImageContentType }> {
  try {
    const image = sharp(bytes);
    const { width } = await image.metadata();
    if (!width || width <= MAX_IMAGE_WIDTH) return { bytes, contentType };
    const shrunk = await image
      .resize({ width: MAX_IMAGE_WIDTH })
      .webp({ quality: 85 })
      .toBuffer();
    return { bytes: new Uint8Array(shrunk), contentType: "image/webp" };
  } catch (err) {
    // 压缩失败不阻塞上传，退回原图
    console.warn("[question-image] shrink failed, fallback to original", err);
    return { bytes, contentType };
  }
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
    const shrunk = await shrinkImage(bytes, contentType);
    const result = await uploadQuestionImage(shrunk.bytes, shrunk.contentType);
    return NextResponse.json({ path: result.objectPath, url: result.url });
  } catch (err) {
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

import { requireAdmin } from "@/lib/middleware";
import {
  MAX_QUESTION_IMAGE_BYTES,
  StorageConfigError,
  StorageUploadError,
  detectImageType,
  uploadQuestionImage,
} from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

/**
 * 上传题目图片（题干/选项/解析里插入的图）：multipart/form-data，字段名 file。
 * 校验文件头而不是客户端声明的 Content-Type，避免伪造类型上传脚本。
 * 返回相对路径和完整 URL，编辑器直接拿 URL 插入 <img>。
 */
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
    const result = await uploadQuestionImage(bytes, contentType);
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

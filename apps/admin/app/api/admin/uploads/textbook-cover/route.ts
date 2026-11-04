import { requirePermission } from "@/lib/middleware";
import {
  MAX_TEXTBOOK_COVER_BYTES,
  StorageConfigError,
  StorageUploadError,
  detectImageType,
  uploadTextbookCover,
} from "@/lib/storage";
import { normalizeTextbookCover } from "@/lib/textbook-cover";
import { NextRequest, NextResponse } from "next/server";

/** 上传教材封面：multipart/form-data，字段名 file */
export async function POST(request: NextRequest) {
  const admin = await requirePermission(request, "textbooks");
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
    const normalized = await normalizeTextbookCover(bytes, contentType);
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

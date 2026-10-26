import { requireAppUser } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import {
  MAX_AVATAR_BYTES,
  StorageConfigError,
  StorageUploadError,
  deleteAvatar,
  detectImageType,
  uploadAvatar,
} from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

/**
 * 上传头像：multipart/form-data，字段名 file。
 * 校验通过后写入 Supabase Storage 的 sharpbucket，并把公开地址存进 User.avatar。
 * 若 Storage 成功但 prisma update 失败，会补偿删除刚上传的 object，避免留下孤儿文件。
 */
export async function POST(request: NextRequest) {
  const appUser = requireAppUser(request);
  if (appUser instanceof NextResponse) return appUser;

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
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { error: `avatar must be smaller than ${MAX_AVATAR_BYTES / 1024 / 1024}MB` },
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

  let objectPath: string;
  let avatarUrl: string;
  try {
    const { publicUrl, objectPath: path } = await uploadAvatar(
      appUser.id,
      bytes,
      contentType,
    );
    avatarUrl = publicUrl;
    objectPath = path;
  } catch (err) {
    if (err instanceof StorageConfigError) {
      console.error("[avatar]", err.message);
      return NextResponse.json({ error: "storage is not configured" }, { status: 500 });
    }
    if (err instanceof StorageUploadError) {
      console.error("[avatar] storage error", err.message);
      return NextResponse.json({ error: "avatar upload failed" }, { status: 502 });
    }
    console.error("[avatar] unexpected upload error", err);
    return NextResponse.json({ error: "avatar upload failed" }, { status: 502 });
  }

  try {
    await prisma.user.update({
      where: { id: appUser.id },
      data: { avatar: avatarUrl },
    });
  } catch (err) {
    // 关键：上传成功但 DB 写入失败时，回滚刚上传的 object，避免孤儿文件
    console.error("[avatar] prisma update failed, compensating delete", err);
    await deleteAvatar(objectPath);
    return NextResponse.json({ error: "failed to save avatar" }, { status: 500 });
  }

  return NextResponse.json({ avatar: avatarUrl });
}

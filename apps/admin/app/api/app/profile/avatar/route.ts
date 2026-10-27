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
  try {
    const result = await uploadAvatar(appUser.id, bytes, contentType);
    objectPath = result.objectPath;
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

  let oldAvatarPath: string | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: appUser.id },
      select: { avatar: true },
    });
    oldAvatarPath = user?.avatar ?? null;
  } catch {
    // 查旧头像失败不阻塞上传——极端情况：用户记录突然消失
  }

  try {
    // DB 里存新的随机路径，展示层用 avatarPublicUrl() 拼完整 URL
    await prisma.user.update({
      where: { id: appUser.id },
      data: { avatar: objectPath },
    });
  } catch (err) {
    console.error("[avatar] prisma update failed, compensating delete", err);
    await deleteAvatar(objectPath);
    return NextResponse.json({ error: "failed to save avatar" }, { status: 500 });
  }

  // DB 更新成功后删除旧头像（仅删相对路径，完整 URL 是历史数据不碰）
  if (oldAvatarPath && !oldAvatarPath.startsWith("http")) {
    deleteAvatar(oldAvatarPath).catch(() => {
      // 旧图删失败静默，不影响本次上传结果
    });
  }

  // 返回相对路径，客户端用 avatarPublicUrl 拼完整 URL；
  // 同时也返回完整 URL（avatarFull）给立即渲染用，前端可直接消费
  return NextResponse.json({ avatar: objectPath });
}

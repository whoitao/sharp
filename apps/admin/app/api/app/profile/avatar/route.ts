import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/middleware";
import {
  MAX_AVATAR_BYTES,
  StorageConfigError,
  detectImageType,
  uploadAvatar,
} from "@/lib/storage";

/**
 * 上传头像：multipart/form-data，字段名 file。
 * 校验通过后写入 Supabase Storage 的 sharpbucket，并把公开地址存进 User.avatar。
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

  let avatar: string;
  try {
    avatar = await uploadAvatar(appUser.id, bytes, contentType);
  } catch (err) {
    if (err instanceof StorageConfigError) {
      console.error("[avatar]", err.message);
      return NextResponse.json({ error: "storage is not configured" }, { status: 500 });
    }
    console.error("[avatar] upload failed", err);
    return NextResponse.json({ error: "avatar upload failed" }, { status: 502 });
  }

  await prisma.user.update({
    where: { id: appUser.id },
    data: { avatar },
  });

  return NextResponse.json({ avatar });
}

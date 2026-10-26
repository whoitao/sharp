// Supabase Storage 封装：头像走服务端中转，service role key 只在服务端持有。
// 直接用 Storage 的 REST 接口，避免为此再引入 @supabase/supabase-js。

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET ?? "sharpbucket";

/** 单次上传上限 1MB */
export const MAX_AVATAR_BYTES = 1024 * 1024;

export type ImageContentType = "image/jpeg" | "image/png" | "image/webp";

/** 存储配置缺失（环境变量未填） */
export class StorageConfigError extends Error {}

/** 上传失败（Storage 返回非 2xx 或网络异常） */
export class StorageUploadError extends Error {}

/**
 * 只认文件头，不认客户端声明的 Content-Type。
 * 头像接口是登录态下的任意人可调用，伪造 content-type 上传脚本/HTML 是真实风险。
 */
export function detectImageType(bytes: Uint8Array): ImageContentType | null {
  const at = (offset: number, sig: number[]) => sig.every((byte, i) => bytes[offset + i] === byte);

  if (bytes.length >= 3 && at(0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytes.length >= 8 && at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytes.length >= 12 && at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) {
    return "image/webp";
  }
  return null;
}

const CONTENT_TYPE_TO_EXT: Record<ImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * 把 userId 里的斜杠 / \ 换成下划线，防止 ".." 路径穿越或伪造目录名。
 * userId 是 Prisma 生成的自增 ID 或 UUID，理论上不含分隔符，但多一道护栏。
 */
function sanitizeUserId(userId: string): string {
  return userId.replace(/[\\/]/g, "_").replace(/\.\./g, "_");
}

/**
 * 每个用户独立目录：{userId}/avatars/avatar.{ext}。
 * 同名覆盖（x-upsert），换图后旧版本不会留下。
 * 目录本身不需要提前创建——Supabase Storage PUT 带多级 path 会自动建层级。
 */
export function avatarPath(userId: string, contentType: ImageContentType): string {
  const safeId = sanitizeUserId(userId);
  const ext = CONTENT_TYPE_TO_EXT[contentType];
  return `${safeId}/avatars/avatar.${ext}`;
}

/**
 * 根据相对路径拼接公开 URL。
 * path 允许：
 *   - 相对路径：{userId}/avatars/avatar.jpg  →  拼上 Supabase Storage 域名
 *   - 已带完整协议：https://...  →  原样返回（兼容历史已存完整 URL 的用户头像）
 */
export function avatarPublicUrl(path: string, version?: number): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const v = version ?? Date.now();
  return `${SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${path}?v=${v}`;
}

/**
 * 头像只存相对路径在 DB：{userId}/avatars/avatar.jpg
 * 这样 Supabase project 迁移 / 换 CDN 时不用批量改 DB。
 * 调用 avatarPublicUrl(path) 在展示层拼完整 URL。
 */
export async function uploadAvatar(
  userId: string,
  bytes: Uint8Array,
  contentType: ImageContentType,
): Promise<{ objectPath: string }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new StorageConfigError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const path = avatarPath(userId, contentType);
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/storage/v1/object/${AVATAR_BUCKET}/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": contentType,
        "x-upsert": "true",
        "cache-control": "no-cache",
      },
      body: bytes.slice().buffer as ArrayBuffer,
    });
  } catch (err) {
    throw new StorageUploadError(`Storage request failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new StorageUploadError(`${response.status} ${detail.slice(0, 200)}`);
  }

  // 只返回相对路径，不拼域名
  return { objectPath: path };
}

/** 补偿删除：upload 成功但 prisma update 失败时清理刚上传的 object，避免留下孤儿文件 */
export async function deleteAvatar(path: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${AVATAR_BUCKET}/${path}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    });
  } catch {
    // 补偿删除失败静默，避免掩盖主错误
  }
}

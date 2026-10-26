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

/** 固定 key：换图即覆盖，不会留下历史孤儿文件 */
export function avatarPath(userId: string): string {
  return `avatars/${userId}`;
}

// key 固定，换图后 URL 不变，所以带一个版本号查询参数让客户端绕过图片缓存
export function avatarPublicUrl(path: string, version: number = Date.now()): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${path}?v=${version}`;
}

/** 上传（覆盖）头像，返回桶的公开访问地址 */
export async function uploadAvatar(userId: string, bytes: Uint8Array, contentType: ImageContentType): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new StorageConfigError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const path = avatarPath(userId);
  const version = Date.now();
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
      // fetch 要求 ArrayBuffer 视图，转一份避免 SharedArrayBuffer 类型不兼容
      body: bytes.slice().buffer as ArrayBuffer,
    });
  } catch (err) {
    throw new StorageUploadError(`Storage request failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new StorageUploadError(`${response.status} ${detail.slice(0, 200)}`);
  }

  return avatarPublicUrl(path, version);
}

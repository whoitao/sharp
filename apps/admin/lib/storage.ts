// Supabase Storage 封装：头像走服务端中转，service role key 只在服务端持有。
// 直接用 Storage 的 REST 接口，避免为此再引入 @supabase/supabase-js。

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.SUPABASE_AVATAR_BUCKET ?? "sharpbucket";

/** 头像单次上传上限 5MB */
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/** 题目图片单次上传上限 5MB */
export const MAX_QUESTION_IMAGE_BYTES = 5 * 1024 * 1024;

/** 反馈正文图片单次上传上限 5MB */
export const MAX_FEEDBACK_IMAGE_BYTES = 5 * 1024 * 1024;

/** 教材封面单次上传上限 10MB */
export const MAX_TEXTBOOK_COVER_BYTES = 10 * 1024 * 1024;

/** 站点素材：logo 2MB / favicon 1MB / 分享图 5MB */
export const MAX_SITE_LOGO_BYTES = 2 * 1024 * 1024;
export const MAX_SITE_FAVICON_BYTES = 1 * 1024 * 1024;
export const MAX_SITE_OG_BYTES = 5 * 1024 * 1024;

export type SiteAssetKind = "logo" | "favicon" | "og";

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
 * 每个用户独立目录：{userId}/avatars/{随机UUID}.{ext}。
 * 每次上传生成新文件名，避免覆盖旧图的同时天然绕过 CDN 缓存（路径变化 = 新 URL）。
 * 旧头像由调用方在 DB 更新成功后主动删除（见 route.ts）。
 */
export function avatarPath(userId: string, contentType: ImageContentType): string {
  const safeId = sanitizeUserId(userId);
  return `${safeId}/avatars/${randomId()}.${CONTENT_TYPE_TO_EXT[contentType]}`;
}

function randomId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}?v=${v}`;
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
  const path = avatarPath(userId, contentType);
  await putObject(path, bytes, contentType);
  // 只返回相对路径，不拼域名
  return { objectPath: path };
}

/** 写入 Storage object，路径由调用方决定 */
async function putObject(path: string, bytes: Uint8Array, contentType: ImageContentType): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new StorageConfigError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
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
}

/** 补偿删除：upload 成功但 prisma update 失败时清理刚上传的 object，避免留下孤儿文件 */
export async function deleteAvatar(path: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
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

/**
 * 题目图片：questions/{随机UUID}.{ext}，全站共用一套目录。
 * 文件名随机，既避免覆盖，也能长期缓存（路径不变，内容不变）。
 */
export function questionImagePath(contentType: ImageContentType): string {
  return `questions/${randomId()}.${CONTENT_TYPE_TO_EXT[contentType]}`;
}

/** 存入题干/选项/解析的图片地址（完整 URL，客户端直接渲染） */
export function questionImagePublicUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/** 上传题目图片，返回相对路径与完整 URL */
export async function uploadQuestionImage(
  bytes: Uint8Array,
  contentType: ImageContentType,
): Promise<{ objectPath: string; url: string }> {
  const path = questionImagePath(contentType);
  await putObject(path, bytes, contentType);
  return { objectPath: path, url: questionImagePublicUrl(path) };
}

/** Wiki 正文图片：wiki/{随机UUID}.{ext} */
export function wikiImagePath(contentType: ImageContentType): string {
  return `wiki/${randomId()}.${CONTENT_TYPE_TO_EXT[contentType]}`;
}

/** Wiki 正文图片的完整 URL */
export function wikiImagePublicUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/** 上传 Wiki 正文图片，返回相对路径与完整 URL */
export async function uploadWikiImage(
  bytes: Uint8Array,
  contentType: ImageContentType,
): Promise<{ objectPath: string; url: string }> {
  const path = wikiImagePath(contentType);
  await putObject(path, bytes, contentType);
  return { objectPath: path, url: wikiImagePublicUrl(path) };
}

/** 反馈正文图片：feedback/{userId}/{随机UUID}.{ext}，按用户分目录便于校验归属 */
export function feedbackImagePath(userId: string, contentType: ImageContentType): string {
  return `feedback/${sanitizeUserId(userId)}/${randomId()}.${CONTENT_TYPE_TO_EXT[contentType]}`;
}

/** 反馈正文图片的完整 URL */
export function feedbackImagePublicUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/** 用户反馈图片的 URL 前缀：提交时用它校验正文里的 <img> 只能来自本人目录 */
export function feedbackImageUrlPrefix(userId: string): string {
  return feedbackImagePublicUrl(`feedback/${sanitizeUserId(userId)}/`);
}

/** 上传反馈正文图片，返回相对路径与完整 URL */
export async function uploadFeedbackImage(
  userId: string,
  bytes: Uint8Array,
  contentType: ImageContentType,
): Promise<{ objectPath: string; url: string }> {
  const path = feedbackImagePath(userId, contentType);
  await putObject(path, bytes, contentType);
  return { objectPath: path, url: feedbackImagePublicUrl(path) };
}

/** 教材封面：textbooks/covers/{随机UUID}.{ext} */
export function textbookCoverPath(contentType: ImageContentType): string {
  return `textbooks/covers/${randomId()}.${CONTENT_TYPE_TO_EXT[contentType]}`;
}

/** DB 存相对路径，展示/接口层拼完整 URL */
export function textbookCoverPublicUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/** 上传教材封面，返回相对路径与完整 URL */
export async function uploadTextbookCover(
  bytes: Uint8Array,
  contentType: ImageContentType,
): Promise<{ objectPath: string; url: string }> {
  const path = textbookCoverPath(contentType);
  await putObject(path, bytes, contentType);
  return { objectPath: path, url: textbookCoverPublicUrl(path) };
}

/** 站点素材：site/{logo|favicon|og}/{随机UUID}.{ext} */
export function siteAssetPath(kind: SiteAssetKind, contentType: ImageContentType): string {
  return `site/${kind}/${randomId()}.${CONTENT_TYPE_TO_EXT[contentType]}`;
}

/** 站点素材的完整 URL（DB 只存相对路径） */
export function siteAssetPublicUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/** 上传站点素材，返回相对路径与完整 URL */
export async function uploadSiteAsset(
  bytes: Uint8Array,
  contentType: ImageContentType,
  kind: SiteAssetKind,
): Promise<{ objectPath: string; url: string }> {
  const path = siteAssetPath(kind, contentType);
  await putObject(path, bytes, contentType);
  return { objectPath: path, url: siteAssetPublicUrl(path) };
}

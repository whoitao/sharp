/**
 * 头像展示地址：DB 里只存相对路径（{userId}/avatars/avatar.jpg），
 * 与移动端 buildAvatarUrl 的口径一致，服务端拼完整 URL 后返回给浏览器。
 * 未配置环境变量时使用与移动端相同的公共项目地址兜底。
 */
const SUPABASE_URL = (
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://faliyecwupijgmjbvzca.supabase.co"
).replace(/\/+$/, "");

const STORAGE_BUCKET = process.env.SUPABASE_AVATAR_BUCKET ?? "sharpbucket";

export function avatarPublicUrl(path: string, version?: number): string {
  // 兼容历史上已存完整 URL 的记录
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  // 上传路径带随机文件名，路径变化即天然绕过缓存，无需默认版本号
  const query = version ? `?v=${version}` : "";
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}${query}`;
}

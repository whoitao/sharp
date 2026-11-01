/** 固定格式的日期（避免服务端与客户端时区/语言差异导致 hydration 不一致） */
export function formatArticleDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

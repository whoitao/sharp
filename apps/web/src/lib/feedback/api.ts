/** 问题反馈接口封装：统一走 Web BFF /api/app/*，登录态由 Cookie 携带 */

export type FeedbackCategory = "bug" | "suggestion" | "content" | "account" | "other";
export type FeedbackStatus = "pending" | "replied" | "closed";

/** 与后端 FEEDBACK_MIN_TEXT / FEEDBACK_MAX_TEXT 保持一致（按纯文本长度计算） */
export const FEEDBACK_MIN_TEXT = 5;
export const FEEDBACK_MAX_TEXT = 2000;

export interface FeedbackListItem {
  id: string;
  summary: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  replyCount: number;
  lastReplyAt: string | null;
  hasUnreadReply: boolean;
  createdAt: string;
}

export interface FeedbackReplyItem {
  id: string;
  authorType: "user" | "admin";
  content: string;
  createdAt: string;
}

export interface FeedbackDetail {
  id: string;
  content: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  source: string;
  pageContext: string | null;
  contact: string | null;
  replyCount: number;
  createdAt: string;
  lastReplyAt: string | null;
  replies: FeedbackReplyItem[];
}

export class FeedbackApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "FeedbackApiError";
  }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/app${path}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
    ...init,
  });
  if (!res.ok) throw new FeedbackApiError(res.status, await errorMessage(res));
  return (await res.json()) as T;
}

export function listFeedback(params: { page?: number; pageSize?: number }): Promise<{
  items: FeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });
  return request(`/feedback?${query.toString()}`);
}

export function getFeedback(id: string): Promise<FeedbackDetail> {
  return request(`/feedback/${encodeURIComponent(id)}`);
}

export function createFeedback(payload: {
  content: string;
  category: FeedbackCategory;
  contact?: string;
  pageContext?: string;
  clientVersion?: string;
}): Promise<{ id: string }> {
  return request(`/feedback`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  });
}

export function replyFeedback(id: string, content: string): Promise<FeedbackReplyItem> {
  return request(`/feedback/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ content }),
  });
}

/** multipart 字段名固定为 file；浏览器自动带 boundary，不要手动设置 content-type */
export function uploadFeedbackImage(file: File): Promise<{ url: string; path: string }> {
  const form = new FormData();
  form.append("file", file);
  return request(`/feedback/upload`, {
    method: "POST",
    body: form,
  });
}

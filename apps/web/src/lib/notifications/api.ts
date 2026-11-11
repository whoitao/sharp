/** 站内信接口封装：统一走 Web BFF /api/app/*，登录态由 Cookie 携带 */

export interface NotificationItem {
  id: string;
  type: "system" | "pet" | "study" | "account";
  level: "info" | "warning" | "important";
  title: string;
  body: string;
  actionType: "none" | "page" | "url";
  actionValue: string | null;
  publishedAt: string | null;
  readAt: string | null;
  isRead: boolean;
}

export interface NotificationListResult {
  items: NotificationItem[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

export class NotificationApiError extends Error {
  constructor(
    public readonly status: number,
    message = "notification request failed",
  ) {
    super(message);
    this.name = "NotificationApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/app${path}`, { cache: "no-store", ...init });
  if (!res.ok) throw new NotificationApiError(res.status);
  return (await res.json()) as T;
}

export function fetchNotifications(params: {
  filter?: "all" | "unread";
  page?: number;
  pageSize?: number;
}): Promise<NotificationListResult> {
  const query = new URLSearchParams({
    filter: params.filter ?? "all",
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });
  return request<NotificationListResult>(`/notifications?${query.toString()}`);
}

export function fetchUnreadCount(): Promise<{ count: number }> {
  return request<{ count: number }>("/notifications/unread-count");
}

export function fetchNotificationDetail(id: string): Promise<NotificationItem> {
  return request<NotificationItem>(`/notifications/detail?id=${encodeURIComponent(id)}`);
}

export function markNotificationRead(id: string): Promise<{ id: string; readAt: string }> {
  return request(`/notifications/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export function markAllNotificationsRead(): Promise<{ count: number }> {
  return request(`/notifications/read-all`, { method: "POST" });
}

/** 已读状态变化事件：铃铛、列表、详情三处共享同一份未读数 */
export const NOTIFICATIONS_CHANGED_EVENT = "sharp:notifications-changed";

export function notifyNotificationsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }
}

export function subscribeNotificationsChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handler);
  return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handler);
}

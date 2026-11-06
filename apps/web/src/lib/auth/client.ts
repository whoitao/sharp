"use client";

/** 登录态变化事件：登录页与导航栏各自持有会话状态，用事件保持同步 */
export const SESSION_EVENT = "sharp:session-changed";

export function notifySessionChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EVENT));
  }
}

export function subscribeSession(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SESSION_EVENT, handler);
  return () => window.removeEventListener(SESSION_EVENT, handler);
}

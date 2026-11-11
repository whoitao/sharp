"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { subscribeSession } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  notifyNotificationsChanged,
  subscribeNotificationsChanged,
  type NotificationItem,
} from "@/lib/notifications/api";
import { relativeTime } from "@/lib/notifications/format";
import { cn } from "@/lib/utils";
import { Bell, BookOpen, Loader2, PawPrint, UserRound, Megaphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

const TYPE_ICONS: Record<NotificationItem["type"], LucideIcon> = {
  system: Megaphone,
  pet: PawPrint,
  study: BookOpen,
  account: UserRound,
};

/** 导航栏铃铛：未读数 + 最近 5 条，登录后才显示 */
export function NotificationBell() {
  const { t } = useLocale();
  const router = useRouter();

  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const data = await fetchUnreadCount();
      setCount(data.count);
      setVisible(true);
    } catch {
      // 401/网络失败时保持隐藏，避免把铃铛展示给未登录用户
      setVisible(false);
    }
  }, []);

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications({ page: 1, pageSize: 5 });
      setItems(data.items);
      setCount(data.unreadCount);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCount();
    const unsubscribeSession = subscribeSession(() => void refreshCount());
    const unsubscribeChanged = subscribeNotificationsChanged(() => void refreshCount());
    const onFocus = () => void refreshCount();
    window.addEventListener("focus", onFocus);
    return () => {
      unsubscribeSession();
      unsubscribeChanged();
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshCount]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void refreshList();
  };

  const handleOpenItem = async (item: NotificationItem) => {
    setOpen(false);
    if (!item.isRead) {
      try {
        await markNotificationRead(item.id);
        setCount((n) => Math.max(0, n - 1));
        notifyNotificationsChanged();
      } catch {
        /* 已读失败不阻断跳转 */
      }
    }
    router.push(`/account/notifications/${item.id}`);
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead();
      setCount(0);
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: item.readAt })));
      notifyNotificationsChanged();
    } catch {
      /* 失败保持原状 */
    }
  };

  if (!visible) return null;

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          aria-label={t("notifications.bellLabel")}
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b border-border-light px-3.5 py-2.5">
          <span className="text-sm font-semibold">{t("notifications.bellLabel")}</span>
          <Link
            href="/account/notifications"
            className="text-xs font-semibold text-primary-strong hover:underline"
            onClick={() => setOpen(false)}
          >
            {t("notifications.viewAll")}
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-foreground-secondary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("notifications.loading")}
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-xs text-foreground-secondary">
            {t("notifications.empty")}
          </div>
        ) : (
          <ul className="max-h-[320px] overflow-y-auto">
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type] ?? Megaphone;
              return (
                <li key={item.id} className="border-b border-border-light last:border-b-0">
                  <button
                    type="button"
                    onClick={() => void handleOpenItem(item)}
                    className="flex w-full items-start gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-accent"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-strong">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "min-w-0 truncate text-[13px]",
                            item.isRead
                              ? "font-medium text-foreground-secondary"
                              : "font-semibold text-foreground",
                          )}
                        >
                          {item.title}
                        </span>
                        {!item.isRead && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-foreground-secondary">
                        {item.body}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-foreground-tertiary">
                        {relativeTime(item.publishedAt, t)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-border-light p-1">
          <DropdownMenuItem
            disabled={count === 0}
            onSelect={(event) => {
              event.preventDefault();
              void handleReadAll();
            }}
            className="justify-center text-xs font-semibold text-primary-strong data-[disabled]:text-foreground-tertiary"
          >
            {t("notifications.markAllRead")}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

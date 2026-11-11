"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifyNotificationsChanged,
  subscribeNotificationsChanged,
  type NotificationItem,
} from "@/lib/notifications/api";
import { absoluteTime, relativeTime } from "@/lib/notifications/format";
import { cn } from "@/lib/utils";
import {
  Bell,
  BookOpen,
  CheckCheck,
  ChevronRight,
  Loader2,
  Megaphone,
  PawPrint,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

const TYPE_META: Record<NotificationItem["type"], { icon: LucideIcon; labelKey: string }> = {
  system: { icon: Megaphone, labelKey: "notifications.typeSystem" },
  pet: { icon: PawPrint, labelKey: "notifications.typePet" },
  study: { icon: BookOpen, labelKey: "notifications.typeStudy" },
  account: { icon: UserRound, labelKey: "notifications.typeAccount" },
};

type Filter = "all" | "unread";
type LoadStatus = "loading" | "ready" | "error";

const PAGE_SIZE = 20;

/** 个人中心「消息」：左侧栏由 account layout 提供，这里只渲染列表内容 */
export function NotificationsPanel() {
  const { t, locale } = useLocale();

  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setStatus("loading");
      try {
        const data = await fetchNotifications({
          filter,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setPage(data.page);
        setTotal(data.total);
        setUnreadCount(data.unreadCount);
        setStatus("ready");
      } catch {
        if (!append) {
          setItems([]);
          setStatus("error");
        }
      } finally {
        setLoadingMore(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    void load(1, false);
  }, [load]);

  useEffect(
    () => subscribeNotificationsChanged(() => void load(1, false)),
    [load],
  );

  const handleOpen = (item: NotificationItem) => {
    if (item.isRead) return;
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, isRead: true, readAt: new Date().toISOString() } : row,
      ),
    );
    setUnreadCount((n) => Math.max(0, n - 1));
    void markNotificationRead(item.id)
      .then(() => notifyNotificationsChanged())
      .catch(() => null);
  };

  const handleReadAll = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) =>
        prev.map((row) => ({ ...row, isRead: true, readAt: row.readAt ?? new Date().toISOString() })),
      );
      setUnreadCount(0);
      if (filter === "unread") {
        setItems([]);
        setTotal(0);
      }
      notifyNotificationsChanged();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="min-w-0 pb-2 md:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-border bg-surface p-1">
          {(["all", "unread"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
              aria-pressed={filter === value}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
                filter === value
                  ? "bg-primary-light text-primary-strong"
                  : "text-foreground-secondary hover:bg-accent",
              )}
            >
              {value === "all" ? t("notifications.all") : t("notifications.unread")}
              {value === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-strong"
          disabled={unreadCount === 0 || markingAll}
          onClick={() => void handleReadAll()}
        >
          {markingAll ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCheck className="h-3.5 w-3.5" />
          )}
          {t("notifications.markAllRead")}
        </Button>
      </div>

      {status === "loading" ? (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border bg-surface py-12 text-sm text-foreground-secondary card-shadow">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("notifications.loading")}
        </div>
      ) : status === "error" ? (
        <div className="mt-4 flex flex-col items-center rounded-lg border border-border bg-surface px-4 py-12 text-center card-shadow">
          <p className="text-sm font-semibold">{t("notifications.loadError")}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void load(1, false)}>
            {t("notifications.retry")}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-lg border border-border bg-surface px-4 py-14 text-center card-shadow">
          <Bell className="h-9 w-9 text-primary" />
          <p className="mt-3 text-sm font-semibold">
            {filter === "unread" ? t("notifications.emptyUnread") : t("notifications.empty")}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-3 space-y-2.5">
            {items.map((item) => {
              const meta = TYPE_META[item.type] ?? TYPE_META.system;
              const Icon = meta.icon;
              return (
                <li key={item.id}>
                  <Link
                    href={`/account/notifications/${item.id}`}
                    onClick={() => handleOpen(item)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-colors card-shadow hover:border-primary/40",
                      !item.isRead && "border-l-[3px] border-l-primary",
                    )}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-strong">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "min-w-0 truncate",
                            item.isRead
                              ? "text-sm font-medium text-foreground-secondary"
                              : "text-sm font-bold text-foreground",
                          )}
                        >
                          {item.title}
                        </span>
                        {!item.isRead && (
                          <span className="shrink-0 rounded-full bg-primary-light px-1.5 py-0.5 text-[10px] font-bold text-primary-strong">
                            {t("notifications.unreadBadge")}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-foreground-secondary">
                        {item.body}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-foreground-tertiary">
                        <span>{t(meta.labelKey)}</span>
                        <span aria-hidden>·</span>
                        <span title={absoluteTime(item.publishedAt, locale)}>
                          {relativeTime(item.publishedAt, t)}
                        </span>
                        {item.actionType !== "none" && item.actionValue && (
                          <span className="ml-auto inline-flex items-center gap-0.5 font-semibold text-primary-strong">
                            {t("notifications.goToAction")}
                            <ChevronRight className="h-3 w-3" />
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {items.length < total && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={loadingMore}
                onClick={() => void load(page + 1, true)}
              >
                {loadingMore && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {t("notifications.loadMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

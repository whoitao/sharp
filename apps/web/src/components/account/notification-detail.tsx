"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import {
  fetchNotificationDetail,
  markNotificationRead,
  notifyNotificationsChanged,
  type NotificationItem,
} from "@/lib/notifications/api";
import { absoluteTime } from "@/lib/notifications/format";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  ChevronRight,
  Loader2,
  Megaphone,
  PawPrint,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

const TYPE_META: Record<NotificationItem["type"], { icon: LucideIcon; labelKey: string }> = {
  system: { icon: Megaphone, labelKey: "notifications.typeSystem" },
  pet: { icon: PawPrint, labelKey: "notifications.typePet" },
  study: { icon: BookOpen, labelKey: "notifications.typeStudy" },
  account: { icon: UserRound, labelKey: "notifications.typeAccount" },
};

type LoadStatus = "loading" | "ready" | "missing" | "error";

/** 消息详情：进入即视为已读；左侧栏由 account layout 提供 */
export function NotificationDetail({ id }: { id: string }) {
  const { t, locale } = useLocale();
  const [item, setItem] = useState<NotificationItem | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    fetchNotificationDetail(id)
      .then((data) => {
        if (!alive) return;
        setItem(data);
        setStatus("ready");
        if (!data.isRead) {
          void markNotificationRead(data.id)
            .then(() => notifyNotificationsChanged())
            .catch(() => null);
        }
      })
      .catch((err: unknown) => {
        if (!alive) return;
        const statusCode =
          err && typeof err === "object" && "status" in err
            ? Number((err as { status: unknown }).status)
            : 0;
        setStatus(statusCode === 404 ? "missing" : "error");
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface py-20 text-sm text-foreground-secondary card-shadow">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("notifications.loading")}
      </div>
    );
  }

  if (status === "missing" || status === "error" || !item) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-border bg-surface px-4 py-16 text-center card-shadow">
        <Bell className="h-9 w-9 text-primary" />
        <p className="mt-3 text-sm font-semibold">
          {status === "missing" ? t("notifications.expired") : t("notifications.loadError")}
        </p>
        <p className="mt-1 text-xs text-foreground-secondary">
          {status === "missing" ? t("notifications.expiredBody") : ""}
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/account/notifications">{t("notifications.back")}</Link>
        </Button>
      </div>
    );
  }

  const meta = TYPE_META[item.type] ?? TYPE_META.system;
  const Icon = meta.icon;
  const actionHref =
    item.actionType === "page" && item.actionValue?.startsWith("/")
      ? item.actionValue
      : item.actionType === "url" && /^https?:\/\//i.test(item.actionValue ?? "")
        ? item.actionValue
        : null;

  return (
    <article className="min-w-0 rounded-lg border border-border bg-surface p-5 card-shadow md:p-6">
      <Link
        href="/account/notifications"
        className="inline-flex items-center gap-1 text-xs font-semibold text-foreground-secondary transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("notifications.back")}
      </Link>

      <header className="mt-4 flex items-start gap-3 border-b border-border-light pb-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-strong">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-7">{item.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground-tertiary">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-semibold",
                item.level === "important"
                  ? "bg-destructive text-destructive-foreground"
                  : item.level === "warning"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-primary-light text-primary-strong",
              )}
            >
              {t(meta.labelKey)}
            </span>
            <span>{absoluteTime(item.publishedAt, locale)}</span>
          </div>
        </div>
      </header>

      <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-foreground">{item.body}</div>

      {actionHref && (
        <div className="mt-6 border-t border-border-light pt-4">
          {item.actionType === "url" ? (
            <Button asChild size="sm">
              <a href={actionHref} target="_blank" rel="noopener noreferrer">
                {t("notifications.goToAction")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href={actionHref}>
                {t("notifications.goToAction")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

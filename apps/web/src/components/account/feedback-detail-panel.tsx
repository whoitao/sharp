"use client";

import { RichText } from "@/components/learn/rich-text";
import { Button } from "@/components/ui/button";
import { getFeedback, replyFeedback, type FeedbackDetail } from "@/lib/feedback/api";
import { useLocale } from "@/lib/i18n";
import { absoluteTime } from "@/lib/notifications/format";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const STATUS_META: Record<string, { labelKey: string; className: string }> = {
  pending: { labelKey: "feedback.statusPending", className: "bg-amber-50 text-amber-700" },
  replied: { labelKey: "feedback.statusReplied", className: "bg-primary-light text-primary-strong" },
  closed: { labelKey: "feedback.statusClosed", className: "bg-accent text-foreground-tertiary" },
};

const CATEGORY_KEYS: Record<string, string> = {
  bug: "feedback.catBug",
  suggestion: "feedback.catSuggestion",
  content: "feedback.catContent",
  account: "feedback.catAccount",
  other: "feedback.catOther",
};

export function FeedbackDetailPanel({ id }: { id: string }) {
  const { t, locale } = useLocale();
  const [detail, setDetail] = useState<FeedbackDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const load = () => {
    setStatus("loading");
    getFeedback(id)
      .then((data) => {
        setDetail(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    setReplyError(null);
    try {
      await replyFeedback(id, reply.trim());
      setReply("");
      load();
    } catch (err) {
      setReplyError(err instanceof Error && err.message ? err.message : t("feedback.replyFailed"));
    } finally {
      setSending(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface py-16 text-sm text-foreground-secondary card-shadow">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("feedback.loading")}
      </div>
    );
  }

  if (status === "error" || !detail) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-border bg-surface px-4 py-16 text-center card-shadow">
        <p className="text-sm font-semibold">{t("feedback.notFound")}</p>
        <Link href="/account/feedback" className="mt-4">
          <Button variant="outline" size="sm">
            {t("feedback.back")}
          </Button>
        </Link>
      </div>
    );
  }

  const meta = STATUS_META[detail.status] ?? STATUS_META.pending;

  return (
    <div className="min-w-0 pb-2 md:pb-0">
      <Link href="/account/feedback" className="inline-flex items-center gap-1 text-xs text-foreground-secondary hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("feedback.back")}
      </Link>

      <article className="mt-3 rounded-lg border border-border bg-surface p-4 card-shadow">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", meta.className)}>
            {t(meta.labelKey)}
          </span>
          <span className="text-[11px] text-foreground-tertiary">{t(CATEGORY_KEYS[detail.category] ?? "feedback.catOther")}</span>
          <span className="ml-auto text-[11px] text-foreground-tertiary">
            {t("feedback.submittedAt", { time: absoluteTime(detail.createdAt, locale) })}
          </span>
        </div>
        <RichText html={detail.content} className="mt-3 text-sm leading-7 text-foreground" />
      </article>

      {detail.replies.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-bold">{t("feedback.conversation")}</h2>
          <ul className="mt-2 space-y-2.5">
            {detail.replies.map((item) => {
              const isAdmin = item.authorType === "admin";
              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-lg border p-3.5 card-shadow",
                    isAdmin ? "border-primary/30 bg-primary-light/40" : "border-border bg-surface",
                  )}
                >
                  <div className="flex items-center gap-2 text-[11px] text-foreground-tertiary">
                    <span className="font-semibold text-foreground-secondary">
                      {isAdmin ? t("feedback.admin") : t("feedback.you")}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{absoluteTime(item.createdAt, locale)}</span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-foreground">{item.content}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {detail.status === "closed" ? (
        <p className="mt-4 rounded-lg border border-border bg-accent px-4 py-3 text-xs text-foreground-secondary">
          {t("feedback.closedHint")}
        </p>
      ) : (
        <section className="mt-4 rounded-lg border border-border bg-surface p-3.5 card-shadow">
          <textarea
            value={reply}
            maxLength={2000}
            rows={3}
            onChange={(event) => setReply(event.target.value)}
            placeholder={t("feedback.replyPlaceholder")}
            className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          {replyError && <p className="mt-2 text-xs font-semibold text-red-600">{replyError}</p>}
          <div className="mt-2 flex justify-end">
            <Button size="sm" disabled={sending || !reply.trim()} onClick={() => void send()}>
              {sending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              {sending ? t("feedback.sending") : t("feedback.sendReply")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

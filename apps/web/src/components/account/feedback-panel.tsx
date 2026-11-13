"use client";

import { FeedbackEditor } from "@/components/account/feedback-editor";
import { Button } from "@/components/ui/button";
import { createFeedback, listFeedback, type FeedbackCategory, type FeedbackListItem, type FeedbackStatus } from "@/lib/feedback/api";
import { useLocale } from "@/lib/i18n";
import { relativeTime } from "@/lib/notifications/format";
import { cn } from "@/lib/utils";
import { ChevronRight, Loader2, MessageSquarePlus, MessagesSquare, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const PAGE_SIZE = 20;

const STATUS_META: Record<FeedbackStatus, { labelKey: string; className: string }> = {
  pending: { labelKey: "feedback.statusPending", className: "bg-amber-50 text-amber-700" },
  replied: { labelKey: "feedback.statusReplied", className: "bg-primary-light text-primary-strong" },
  closed: { labelKey: "feedback.statusClosed", className: "bg-accent text-foreground-tertiary" },
};

const CATEGORY_KEYS: Record<FeedbackCategory, string> = {
  bug: "feedback.catBug",
  suggestion: "feedback.catSuggestion",
  content: "feedback.catContent",
  account: "feedback.catAccount",
  other: "feedback.catOther",
};

const CATEGORIES: FeedbackCategory[] = ["bug", "suggestion", "content", "account", "other"];

type LoadStatus = "loading" | "ready" | "error";

function plainTextLength(html: string): number {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim().length;
}

/** 个人中心「问题反馈」：列表 + 富文本提交弹窗 */
export function FeedbackPanel() {
  const { t, locale } = useLocale();
  const router = useRouter();

  const [items, setItems] = useState<FeedbackListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadingMore, setLoadingMore] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [html, setHtml] = useState("");
  const [category, setCategory] = useState<FeedbackCategory>("other");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setStatus("loading");
    try {
      const data = await listFeedback({ page: targetPage, pageSize: PAGE_SIZE });
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setPage(data.page);
      setTotal(data.total);
      setStatus("ready");
    } catch {
      if (!append) {
        setItems([]);
        setStatus("error");
      }
    } finally {
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void load(1, false);
  }, [load]);

  const openModal = () => {
    setHtml("");
    setCategory("other");
    setContact("");
    setFormError(null);
    setEditorKey((key) => key + 1);
    setModalOpen(true);
  };

  const submit = async () => {
    const length = plainTextLength(html);
    if (length < 10) {
      setFormError(t("feedback.contentTooShort"));
      return;
    }
    if (length > 2000) {
      setFormError(t("feedback.contentTooLong"));
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createFeedback({
        content: html,
        category,
        contact: contact.trim() || undefined,
        pageContext: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      setModalOpen(false);
      router.push(`/account/feedback/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error && err.message ? err.message : t("feedback.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-w-0 pb-2 md:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">{t("feedback.title")}</h1>
          <p className="mt-1 text-xs text-foreground-secondary">{t("feedback.subtitle")}</p>
        </div>
        <Button size="sm" onClick={openModal}>
          <Plus className="mr-1 h-4 w-4" />
          {t("feedback.newFeedback")}
        </Button>
      </div>

      {status === "loading" ? (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border bg-surface py-12 text-sm text-foreground-secondary card-shadow">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("feedback.loading")}
        </div>
      ) : status === "error" ? (
        <div className="mt-4 flex flex-col items-center rounded-lg border border-border bg-surface px-4 py-12 text-center card-shadow">
          <p className="text-sm font-semibold">{t("feedback.loadError")}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void load(1, false)}>
            {t("feedback.retry")}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-lg border border-border bg-surface px-4 py-14 text-center card-shadow">
          <MessagesSquare className="h-9 w-9 text-primary" />
          <p className="mt-3 text-sm font-semibold">{t("feedback.empty")}</p>
          <p className="mt-1 text-xs text-foreground-secondary">{t("feedback.emptyBody")}</p>
        </div>
      ) : (
        <>
          <ul className="mt-3 space-y-2.5">
            {items.map((item) => {
              const meta = STATUS_META[item.status];
              return (
                <li key={item.id}>
                  <Link
                    href={`/account/feedback/${item.id}`}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-colors card-shadow hover:border-primary/40",
                      item.hasUnreadReply && "border-l-[3px] border-l-primary",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", meta.className)}>
                          {t(meta.labelKey)}
                        </span>
                        <span className="text-[11px] text-foreground-tertiary">{t(CATEGORY_KEYS[item.category])}</span>
                        {item.hasUnreadReply && (
                          <span className="rounded-full bg-primary-light px-1.5 py-0.5 text-[10px] font-bold text-primary-strong">
                            {t("feedback.unreadBadge")}
                          </span>
                        )}
                      </span>
                      <span className="mt-1.5 line-clamp-2 block text-sm leading-6 text-foreground">
                        {item.summary}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-foreground-tertiary">
                        <span>{relativeTime(item.createdAt, t)}</span>
                        {item.replyCount > 0 && (
                          <>
                            <span aria-hidden>·</span>
                            <span>{item.replyCount}</span>
                          </>
                        )}
                        <ChevronRight className="ml-auto h-3.5 w-3.5" />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {items.length < total && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" disabled={loadingMore} onClick={() => void load(page + 1, true)}>
                {loadingMore && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {t("feedback.loadMore")}
              </Button>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-xl bg-background p-5 sm:rounded-xl">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold">{t("feedback.submitTitle")}</h2>
            </div>

            <label className="mt-4 block text-xs font-semibold text-foreground-secondary">
              {t("feedback.categoryLabel")}
            </label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {CATEGORIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors",
                    category === value
                      ? "border-primary bg-primary-light text-primary-strong"
                      : "text-foreground-secondary hover:bg-accent",
                  )}
                >
                  {t(CATEGORY_KEYS[value])}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-xs font-semibold text-foreground-secondary">
              {t("feedback.contentLabel")}
            </label>
            <div className="mt-1.5">
              <FeedbackEditor key={editorKey} onChange={setHtml} />
              <p className="mt-1 text-[11px] text-foreground-tertiary">{t("feedback.contentPlaceholder")}</p>
            </div>

            <label className="mt-4 block text-xs font-semibold text-foreground-secondary">
              {t("feedback.contactLabel")}
            </label>
            <input
              value={contact}
              maxLength={120}
              onChange={(event) => setContact(event.target.value)}
              placeholder={t("feedback.contactPlaceholder")}
              className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />

            {formError && <p className="mt-3 text-xs font-semibold text-red-600">{formError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" disabled={submitting} onClick={() => setModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button size="sm" disabled={submitting} onClick={() => void submit()}>
                {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {submitting ? t("feedback.submitting") : t("feedback.submit")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

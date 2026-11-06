"use client";

import { QuizResult } from "@/components/learn/quiz-result";
import { QuizRunner } from "@/components/learn/quiz-runner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { AppApiError } from "@/lib/learn/api";
import {
  fetchUnitQuestions,
  quizSessionKey,
  startStudy,
  type PreviousStudy,
  type QuizOutcome,
  type QuizQuestion,
  type QuizScope,
} from "@/lib/learn/quiz";
import { Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

type LoadState = "loading" | "ready" | "empty" | "error";

/** 参数只接受纯数字；空串/非数字统一视为缺失 */
function digits(value: string | null): string | null {
  return value && /^\d+$/.test(value) ? value : null;
}

function Notice({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="mx-auto mt-4 w-full max-w-[560px] rounded-lg border border-border bg-surface p-6 card-shadow sm:p-8">
      <h1 className="text-lg font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-foreground-secondary">{body}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {t("quiz.retry")}
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/learn">{t("quiz.done")}</Link>
        </Button>
      </div>
    </div>
  );
}

function QuizPageInner() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 章节模式：chapterId + unitIndex；知识点模式：subjectId + knowledgePointId + unitIndex
  const chapterId = digits(searchParams.get("chapterId"));
  const subjectId = digits(searchParams.get("subjectId"));
  const knowledgePointId = digits(searchParams.get("knowledgePointId"));
  const gradeId = digits(searchParams.get("gradeId"));
  const publisherId = digits(searchParams.get("publisherId"));
  const unitIndexParam = digits(searchParams.get("unitIndex"));
  const paramsValid = Boolean(unitIndexParam && (chapterId || subjectId));
  const unitIndex = unitIndexParam ? Number(unitIndexParam) : 0;
  const scope = useMemo<QuizScope>(
    () => ({ chapterId, subjectId, gradeId, publisherId, knowledgePointId }),
    [chapterId, subjectId, gradeId, publisherId, knowledgePointId],
  );

  const [state, setState] = useState<LoadState>("loading");
  const [reload, setReload] = useState(0);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [previous, setPrevious] = useState<PreviousStudy | null>(null);
  const [clientSessionId, setClientSessionId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);

  const goLogin = useCallback(() => {
    const next = `${window.location.pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [router]);

  // 作答会话标识：同一范围同一单元在同一标签页里稳定复用，结算成功后由答题组件清除
  useEffect(() => {
    if (!paramsValid) return;
    const key = quizSessionKey(scope, unitIndex);
    let id: string | null = null;
    try {
      id = window.sessionStorage.getItem(key);
    } catch {
      id = null;
    }
    if (!id) {
      id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      try {
        window.sessionStorage.setItem(key, id);
      } catch {
        // 隐私模式下不可写：沿用本次内存中的标识，重试仍在同一会话内
      }
    }
    setClientSessionId(id);
  }, [scope, unitIndex, paramsValid]);

  useEffect(() => {
    if (!paramsValid) return;
    let alive = true;

    setState("loading");
    setOutcome(null);
    setQuestions([]);
    setPrevious(null);

    // 与移动端一致：先取「上次学习」摘要（同时校验单元有题），再拉本单元题目
    (async () => {
      try {
        const started = await startStudy(scope, unitIndex);
        const list = await fetchUnitQuestions(scope, unitIndex);
        if (!alive) return;
        if (list.length === 0) {
          setState("empty");
          return;
        }
        setPrevious(started.previous);
        setQuestions(list);
        setState("ready");
      } catch (error) {
        if (!alive) return;
        if (error instanceof AppApiError) {
          if (error.status === 401) {
            goLogin();
            return;
          }
          if (error.status === 404) {
            setState("empty");
            return;
          }
        }
        setState("error");
      }
    })();

    return () => {
      alive = false;
    };
  }, [scope, unitIndex, paramsValid, reload, goLogin]);

  if (!paramsValid) {
    return (
      <div className="pb-6 md:pb-8">
        <Notice title={t("quiz.invalidTitle")} body={t("quiz.invalidBody")} />
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="pb-6 md:pb-8">
        <Notice
          title={t("quiz.emptyTitle")}
          body={t("quiz.emptyBody")}
          onRetry={() => setReload((value) => value + 1)}
        />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="pb-6 md:pb-8">
        <Notice
          title={t("quiz.errorTitle")}
          body={t("quiz.errorBody")}
          onRetry={() => setReload((value) => value + 1)}
        />
      </div>
    );
  }

  if (state === "loading" || !clientSessionId) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-foreground-secondary">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("quiz.loading")}
      </div>
    );
  }

  if (outcome) {
    return (
      <QuizResult
        questions={questions}
        outcome={outcome}
        unitIndex={unitIndex}
      />
    );
  }

  return (
    <QuizRunner
      scope={scope}
      unitIndex={unitIndex}
      questions={questions}
      previous={previous}
      clientSessionId={clientSessionId}
      onCompleted={setOutcome}
      onUnauthorized={goLogin}
    />
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="py-16" />}>
      <QuizPageInner />
    </Suspense>
  );
}

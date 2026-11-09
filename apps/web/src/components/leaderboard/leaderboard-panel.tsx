"use client";

import { useLocale } from "@/lib/i18n";
import {
  getQuizLeaderboard,
  getPetLeaderboard,
  LeaderboardApiError,
  type LeaderboardPeriod,
  type QuizLeaderboardEntry,
  type PetLeaderboardEntry,
  type QuizLeaderboardResponse,
  type PetLeaderboardResponse,
} from "@/lib/leaderboard/api";
import { cn } from "@/lib/utils";
import { Loader2, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Tab = "quiz" | "pet";
type LoadStatus = "loading" | "ready" | "error";

const PERIODS: LeaderboardPeriod[] = ["week", "month", "all"];

const PODIUM_RING = ["border-amber-500", "border-slate-400", "border-amber-600"];
const PODIUM_LABEL_COLOR = ["text-amber-500", "text-slate-400", "text-amber-600"];

function Avatar({
  src,
  name,
  size = 40,
  ringClass,
}: {
  src: string | null;
  name: string | null;
  size?: number;
  ringClass?: string;
}) {
  const initials = (name ?? "?").slice(0, 1).toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-light text-primary font-bold",
        ringClass && `border-2 ${ringClass}`
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {src ? (
        <img src={src} alt={name ?? ""} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

function PodiumItem({
  entry,
  displayRank,
  type,
}: {
  entry: QuizLeaderboardEntry | PetLeaderboardEntry;
  displayRank: number;
  type: Tab;
}) {
  const { t } = useLocale();
  const isQuiz = type === "quiz";
  const quizEntry = isQuiz ? (entry as QuizLeaderboardEntry) : null;
  const petEntry = !isQuiz ? (entry as PetLeaderboardEntry) : null;
  const idx = displayRank - 1;
  const labels = ["1ST", "2ND", "3RD"];

  return (
    <div className="flex flex-col items-center gap-2">
      <span className={cn("text-xs font-bold tracking-wider", PODIUM_LABEL_COLOR[idx])}>
        {labels[idx]}
      </span>
      <Avatar
        src={entry.avatar}
        name={entry.nickname}
        size={64}
        ringClass={PODIUM_RING[idx]}
      />
      <span className="max-w-[5rem] truncate text-sm font-medium text-foreground">
        {entry.nickname ?? "—"}
      </span>
      <span className="text-lg font-bold text-foreground">
        {isQuiz
          ? `${quizEntry!.totalQuestions.toLocaleString()} ${t("leaderboard.questions")}`
          : `${petEntry!.petExp.toLocaleString()} ${t("leaderboard.exp")}`}
      </span>
    </div>
  );
}

function QuizRow({ entry }: { entry: QuizLeaderboardEntry }) {
  return (
    <div className="flex items-center gap-4 px-2 py-3">
      <span className="w-6 text-center text-base font-bold text-foreground-secondary">
        {entry.rank}
      </span>
      <Avatar src={entry.avatar} name={entry.nickname} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {entry.nickname ?? "—"}
        </p>
      </div>
      <div className="text-right">
        <p className="text-base font-bold text-foreground">
          {entry.totalQuestions.toLocaleString()}
        </p>
        <p className="text-xs text-foreground-tertiary">
          {entry.accuracy}% {useLocale().t("leaderboard.accuracy")}
        </p>
      </div>
    </div>
  );
}

function PetRow({ entry }: { entry: PetLeaderboardEntry }) {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-4 px-2 py-3">
      <span className="w-6 text-center text-base font-bold text-foreground-secondary">
        {entry.rank}
      </span>
      <Avatar src={entry.avatar} name={entry.nickname} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {entry.nickname ?? "—"}
        </p>
      </div>
      <div className="text-right">
        <p className="text-base font-bold text-foreground">
          {entry.petExp.toLocaleString()}
        </p>
        <p className="text-xs text-foreground-tertiary">
          {entry.petName ?? "Pet"} · {t("leaderboard.level", { n: entry.petLevel })}
        </p>
      </div>
    </div>
  );
}

function MyRankCard({
  type,
  quizUser,
  petUser,
  gap,
}: {
  type: Tab;
  quizUser?: QuizLeaderboardEntry | null;
  petUser?: PetLeaderboardEntry | null;
  gap: number | null;
}) {
  const { t } = useLocale();
  const isQuiz = type === "quiz";
  const user = isQuiz ? quizUser : petUser;
  if (!user) return null;

  const petUser_ = !isQuiz ? (user as PetLeaderboardEntry) : null;
  const quizUser_ = isQuiz ? (user as QuizLeaderboardEntry) : null;

  return (
    <div className="rounded-xl border border-border-light bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <User className="h-4 w-4 text-foreground-secondary" />
        <h3 className="text-base font-bold text-foreground">{t("leaderboard.myRank")}</h3>
      </div>

      <div className="mb-4 text-center">
        <p className="text-5xl font-extrabold text-primary">#{user.rank}</p>
        <p className="mt-1 text-sm text-foreground-secondary">
          {isQuiz ? t("leaderboard.myRankLabel") : t("leaderboard.myPetRankLabel")}
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-surface-secondary p-3 text-center">
          <p className="text-xl font-bold text-foreground">
            {isQuiz
              ? quizUser_!.totalQuestions.toLocaleString()
              : petUser_!.petExp.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-foreground-tertiary">
            {isQuiz ? t("leaderboard.totalQuestions") : t("leaderboard.exp")}
          </p>
        </div>
        <div className="rounded-lg bg-surface-secondary p-3 text-center">
          <p className="text-xl font-bold text-foreground">
            {isQuiz ? `${quizUser_!.accuracy}%` : `Lv.${petUser_!.petLevel}`}
          </p>
          <p className="mt-0.5 text-xs text-foreground-tertiary">
            {isQuiz ? t("leaderboard.accuracy") : t("leaderboard.level", { n: petUser_!.petLevel })}
          </p>
        </div>
      </div>

      {gap != null && gap > 0 && (
        <p className="text-sm text-foreground-secondary">
          {isQuiz
            ? t("leaderboard.gapToNext", { n: gap, rank: user.rank - 1 })
            : t("leaderboard.gapToNextPet", { n: gap, rank: user.rank - 1 })}
        </p>
      )}
    </div>
  );
}

export function LeaderboardPanel() {
  const { t } = useLocale();
  const [tab, setTab] = useState<Tab>("quiz");
  const [period, setPeriod] = useState<LeaderboardPeriod>("month");
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [quizData, setQuizData] = useState<QuizLeaderboardResponse | null>(null);
  const [petData, setPetData] = useState<PetLeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQuiz = useCallback(
    async (p: LeaderboardPeriod) => {
      setStatus("loading");
      setError(null);
      try {
        const data = await getQuizLeaderboard(p);
        setQuizData(data);
        setStatus("ready");
      } catch (e) {
        setError(e instanceof LeaderboardApiError ? e.message : String(e));
        setStatus("error");
      }
    },
    [],
  );

  const loadPet = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const data = await getPetLeaderboard();
      setPetData(data);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof LeaderboardApiError ? e.message : String(e));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (tab === "quiz") {
      loadQuiz(period);
    } else {
      loadPet();
    }
  }, [tab, period, loadQuiz, loadPet]);

  const entries = tab === "quiz" ? quizData?.entries ?? [] : petData?.entries ?? [];
  const currentUser = tab === "quiz" ? quizData?.currentUser : petData?.currentUser;
  const nextRankGap = tab === "quiz" ? quizData?.nextRankGap : petData?.nextRankGap;
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const periodLabel = (p: LeaderboardPeriod) =>
    p === "week" ? t("leaderboard.week") : p === "month" ? t("leaderboard.month") : t("leaderboard.allTime");

  return (
    <div className="mx-auto max-w-5xl px-6 pb-10 pt-2">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("leaderboard.title")}</h1>
        <p className="mt-1 text-sm text-foreground-secondary">{t("leaderboard.subtitle")}</p>
      </div>

      {/* Tab toggle */}
      <div className="mb-4 inline-flex rounded-xl bg-surface-secondary p-1">
        <button
          onClick={() => setTab("quiz")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "quiz"
              ? "bg-surface text-foreground shadow-sm"
              : "text-foreground-secondary hover:text-foreground"
          )}
        >
          📋 {t("leaderboard.quizTab")}
        </button>
        <button
          onClick={() => setTab("pet")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "pet"
              ? "bg-surface text-foreground shadow-sm"
              : "text-foreground-secondary hover:text-foreground"
          )}
        >
          🌿 {t("leaderboard.petTab")}
        </button>
      </div>

      {/* Period filter (quiz only) */}
      {tab === "quiz" && (
        <div className="mb-6 flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                period === p
                  ? "border-primary text-primary"
                  : "border-border-light text-foreground-secondary hover:border-primary/40"
              )}
            >
              {periodLabel(p)}
            </button>
          ))}
        </div>
      )}

      {status === "loading" && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-foreground-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("leaderboard.loading")}
        </div>
      )}

      {status === "error" && (
        <div className="rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {status === "ready" && entries.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-foreground-secondary">{t("leaderboard.empty")}</p>
        </div>
      )}

      {status === "ready" && entries.length > 0 && (
        <div className="flex gap-6">
          {/* Left: podium + ranking */}
          <div className="min-w-0 flex-1">
            {/* Podium */}
            {top3.length === 3 && (
              <div className="mb-6 rounded-xl bg-primary-light/40 p-6">
                <div className="flex items-end justify-center gap-8">
                  <PodiumItem entry={top3[1]} displayRank={2} type={tab} />
                  <PodiumItem entry={top3[0]} displayRank={1} type={tab} />
                  <PodiumItem entry={top3[2]} displayRank={3} type={tab} />
                </div>
              </div>
            )}

            {top3.length > 0 && top3.length < 3 && (
              <div className="mb-6 rounded-xl bg-primary-light/40 p-6">
                <div className="flex items-end justify-center gap-8">
                  {top3.map((entry: QuizLeaderboardEntry | PetLeaderboardEntry, idx: number) => (
                    <PodiumItem key={idx} entry={entry} displayRank={idx + 1} type={tab} />
                  ))}
                </div>
              </div>
            )}

            {/* Full ranking */}
            {rest.length > 0 && (
              <div>
                <h2 className="mb-2 text-base font-bold text-foreground">
                  {t("leaderboard.fullRanking")}
                </h2>
                <div className="divide-y divide-border-light">
                  {rest.map((entry: QuizLeaderboardEntry | PetLeaderboardEntry) =>
                    tab === "quiz" ? (
                      <QuizRow key={entry.userId} entry={entry as QuizLeaderboardEntry} />
                    ) : (
                      <PetRow key={entry.userId} entry={entry as PetLeaderboardEntry} />
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: My Rank card */}
          <div className="w-72 shrink-0">
            <MyRankCard
              type={tab}
              quizUser={tab === "quiz" ? (currentUser as QuizLeaderboardEntry | null) : null}
              petUser={tab === "pet" ? (currentUser as PetLeaderboardEntry | null) : null}
              gap={nextRankGap ?? null}
            />
          </div>
        </div>
      )}
    </div>
  );
}

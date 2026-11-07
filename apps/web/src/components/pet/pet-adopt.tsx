"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import {
  adoptPet,
  getPetHome,
  getPetSpecies,
  PetApiError,
  type PetSpeciesInfo,
} from "@/lib/pet/api";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Loader2, PawPrint } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type LoadStatus = "loading" | "ready" | "error";

export function PetAdopt() {
  const { t } = useLocale();
  const router = useRouter();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [unauthorized, setUnauthorized] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [species, setSpecies] = useState<PetSpeciesInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setStatus("loading");
      try {
        const home = await getPetHome();
        if (!alive) return;
        if (home.pet) {
          router.replace("/account/pet");
          return;
        }
      } catch (error) {
        if (!alive) return;
        if (error instanceof PetApiError && error.status === 401) {
          setUnauthorized(true);
          setStatus("error");
          return;
        }
        setStatus("error");
        return;
      }

      try {
        const list = await getPetSpecies();
        if (!alive) return;
        setSpecies(list);
        setSelectedId(list[0]?.id ?? null);
        setStatus("ready");
      } catch {
        if (alive) setStatus("error");
      }
    };

    void load();
    return () => {
      alive = false;
    };
  }, [reloadKey, router]);

  const handleSubmit = async () => {
    if (submitting) return;
    const name = nickname.trim();
    if (name.length < 1 || name.length > 8) {
      setErrorKey("nicknameInvalid");
      return;
    }
    if (!selectedId) return;

    setSubmitting(true);
    setErrorKey(null);
    try {
      await adoptPet(selectedId, name);
      router.push("/account/pet");
    } catch (error) {
      const code = error instanceof PetApiError ? error.code : null;
      if (code === "PET_ALREADY_ADOPTED") {
        router.replace("/account/pet");
        return;
      }
      setErrorKey(
        code === "INVALID_NICKNAME"
          ? "nicknameInvalid"
          : code === "SPECIES_NOT_FOUND"
            ? "speciesLoadFailed"
            : "adoptFailed",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-6 md:pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/account/pet"
          className="inline-flex items-center gap-1 text-xs font-semibold text-foreground-secondary transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("pet.backToPet")}
        </Link>

        {status === "ready" && species.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label
              htmlFor="pet-nickname"
              className="shrink-0 text-xs font-semibold text-foreground-secondary"
            >
              {t("pet.adoptNickname")}
            </label>
            <input
              id="pet-nickname"
              value={nickname}
              maxLength={8}
              onChange={(event) => {
                setNickname(event.target.value);
                setErrorKey(null);
              }}
              placeholder={t("pet.adoptNicknamePlaceholder")}
              className="h-8 w-20 min-w-0 rounded-md border border-border bg-surface px-2.5 text-xs text-foreground outline-none transition-colors placeholder:text-foreground-tertiary hover:border-primary/40 focus:border-primary sm:w-44"
            />
            <Button
              type="button"
              size="sm"
              className="shrink-0"
              disabled={submitting || !selectedId || nickname.trim().length === 0}
              onClick={() => void handleSubmit()}
            >
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {submitting ? t("pet.adopting") : t("pet.adoptConfirm")}
            </Button>
          </div>
        )}
      </div>

      {errorKey && (
        <p className="mt-2 text-right text-xs text-destructive">
          {errorKey === "nicknameInvalid"
            ? t("pet.nicknameInvalid")
            : errorKey === "speciesLoadFailed"
              ? t("pet.noSpecies")
              : t("pet.adoptFailed")}
        </p>
      )}

      {status === "loading" ? (
        <div className="mt-6 flex items-center justify-center gap-2 py-16 text-sm text-foreground-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("pet.loading")}
        </div>
      ) : status === "error" ? (
        <div className="mt-6 rounded-lg border border-border bg-surface p-6 text-center card-shadow">
          <p className="text-sm font-bold">
            {unauthorized ? t("pet.loginTitle") : t("pet.speciesLoadFailed")}
          </p>
          <p className="mt-1 text-xs text-foreground-secondary">
            {unauthorized ? t("pet.loginBody") : t("pet.loadErrorBody")}
          </p>
          {unauthorized ? (
            <Button asChild size="sm" className="mt-4">
              <Link href="/login?next=/account/pet/adopt">{t("pet.loginCta")}</Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              {t("pet.retry")}
            </Button>
          )}
        </div>
      ) : species.length === 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-surface px-4 py-12 text-center card-shadow">
          <PawPrint className="mx-auto h-10 w-10 text-foreground-tertiary" />
          <p className="mt-3 text-sm font-bold">{t("pet.noSpecies")}</p>
        </div>
      ) : (
        <div className="mt-4 flex min-w-0 flex-col gap-3">
          {species.map((item) => {
            const active = item.id === selectedId;
            const cover = item.stages[0]?.imageUrl ?? null;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelectedId(item.id);
                  setErrorKey(null);
                }}
                className={cn(
                  "flex w-full min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors sm:gap-4 sm:p-4",
                  active
                    ? "border-primary bg-primary-light card-shadow"
                    : "border-border bg-surface hover:border-primary/40",
                )}
              >
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center sm:h-20 sm:w-20">
                  <span className="text-3xl sm:text-4xl">{item.icon ?? "🐾"}</span>
                  {cover && (
                    <img
                      src={cover}
                      alt={item.name}
                      className="absolute inset-0 h-full w-full object-contain"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-sm font-bold sm:text-base">{item.name}</p>
                    {item.theme && (
                      <span className="shrink-0 rounded bg-surface-secondary px-1.5 py-0.5 text-[0.625rem] font-medium text-foreground-tertiary">
                        {item.theme}
                      </span>
                    )}
                  </div>
                  {item.tagline && (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-foreground-secondary">
                      {item.tagline}
                    </p>
                  )}
                  {item.stages.length > 0 && (
                    <p className="mt-1.5 truncate text-[0.6875rem] text-foreground-tertiary">
                      {item.stages.map((stage) => stage.name).join(" → ")}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border-light text-transparent",
                  )}
                >
                  <Check className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
      <Link
        href="/account/pet"
        className="inline-flex items-center gap-1 text-xs font-semibold text-foreground-secondary transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("pet.backToPet")}
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("pet.adoptTitle")}</h1>
        <p className="mt-1 text-xs text-foreground-secondary sm:text-sm">
          {t("pet.adoptHint")}
        </p>
      </header>

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
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-3 sm:grid-cols-2">
            {species.map((item) => {
              const active = item.id === selectedId;
              const cover = item.stages[0]?.imageUrl ?? null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setErrorKey(null);
                  }}
                  className={cn(
                    "relative min-w-0 rounded-lg border p-4 text-left transition-colors",
                    active
                      ? "border-primary bg-primary-light card-shadow"
                      : "border-border bg-surface hover:border-primary/40",
                  )}
                >
                  {active && (
                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-[10px] bg-primary-light">
                    <span className="text-5xl">{item.icon ?? "🐾"}</span>
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
                  <div className="mt-2 text-center">
                    <p className="truncate text-sm font-bold">{item.name}</p>
                    {item.theme && (
                      <p className="mt-0.5 truncate text-[0.6875rem] text-foreground-tertiary">
                        {item.theme}
                      </p>
                    )}
                    {item.tagline && (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-foreground-secondary">
                        {item.tagline}
                      </p>
                    )}
                    <p className="mt-1.5 truncate text-[0.625rem] text-foreground-tertiary">
                      {item.stages.map((stage) => stage.name).join(" → ")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <section className="rounded-lg border border-border bg-surface p-4 card-shadow lg:sticky lg:top-20 lg:self-start">
            <label
              htmlFor="pet-nickname"
              className="block text-sm font-semibold"
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
              className="mt-2 h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-tertiary hover:border-primary/40 focus:border-primary"
            />
            <p className="mt-1.5 text-[0.6875rem] text-foreground-tertiary">
              {t("pet.adoptNicknamePlaceholder")}
            </p>

            {errorKey && (
              <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorKey === "nicknameInvalid"
                  ? t("pet.nicknameInvalid")
                  : errorKey === "speciesLoadFailed"
                    ? t("pet.noSpecies")
                    : t("pet.adoptFailed")}
              </p>
            )}

            <Button
              type="button"
              className="mt-4 w-full justify-center"
              disabled={submitting || !selectedId || nickname.trim().length === 0}
              onClick={() => void handleSubmit()}
            >
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {submitting ? t("pet.adopting") : t("pet.adoptConfirm")}
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}

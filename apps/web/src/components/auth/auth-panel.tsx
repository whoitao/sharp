"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { notifySessionChanged, subscribeSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Loader2, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AuthVisual } from "./auth-visual";

interface AppUser {
  id: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
  gender: string | null;
  phone: string | null;
}

type Mode = "login" | "register";

/** 服务端错误码 → i18n key，避免把英文原文直接抛给用户 */
const ERROR_KEYS: Record<string, string> = {
  INVALID_CREDENTIALS: "auth.errors.invalidCredentials",
  ACCOUNT_DISABLED: "auth.errors.accountDisabled",
  USERNAME_TAKEN: "auth.errors.usernameTaken",
  INVALID_USERNAME: "auth.errors.invalidUsername",
  INVALID_PASSWORD: "auth.errors.invalidPassword",
  INVALID_INPUT: "auth.errors.required",
  UPSTREAM_UNAVAILABLE: "auth.errors.network",
};

export function AuthPanel() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 只接受站内相对路径，避免开放重定向
  const rawNext = searchParams.get("next");
  const nextPath =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : null;

  const [mode, setMode] = useState<Mode>("login");
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // 初始化登录态：Cookie 有效则直接进入已登录视图，刷新不会丢失
  useEffect(() => {
    let alive = true;

    const load = () => {
      fetch("/api/auth/session", { cache: "no-store" })
        .then((res) => res.json())
        .then((data: { user?: AppUser | null }) => {
          if (alive) setUser(data.user ?? null);
        })
        .catch(() => {
          /* 会话校验失败按未登录处理 */
        })
        .finally(() => {
          if (alive) setChecking(false);
        });
    };

    load();
    // 导航栏退出登录时同步回本页
    const unsubscribe = subscribeSession(load);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirm("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setError(null);
    setNotice(null);

    const account = username.trim();
    if (!account || !password) {
      setError(t("auth.errors.required"));
      return;
    }
    if (mode === "register") {
      if (account.length < 3 || account.length > 50) {
        setError(t("auth.errors.invalidUsername"));
        return;
      }
      if (password.length < 6) {
        setError(t("auth.errors.invalidPassword"));
        return;
      }
      if (password !== confirm) {
        setError(t("auth.errors.passwordMismatch"));
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: account, password }),
      });
      const data = (await res.json().catch(() => null)) as {
        user?: AppUser;
        code?: string;
      } | null;

      if (!res.ok) {
        const key = data?.code ? ERROR_KEYS[data.code] : undefined;
        setError(t(key ?? "auth.errors.generic"));
        return;
      }

      if (mode === "register") {
        // 注册接口不返回 token：切回登录并保留账号，不伪造会话
        setMode("login");
        setPassword("");
        setConfirm("");
        setNotice(t("auth.registerSuccess"));
        return;
      }

      setUser(data?.user ?? null);
      setPassword("");
      setConfirm("");
      notifySessionChanged();
      // 从受保护页面跳转过来的，登录成功后直接回到原页面
      if (nextPath) router.replace(nextPath);
    } catch {
      setError(t("auth.errors.network"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* 网络失败时仍然清空本地视图，服务端 Cookie 会在过期后失效 */
    }
    setUser(null);
    switchMode("login");
    setNotice(t("auth.signedOut"));
    notifySessionChanged();
  }

  if (checking) {
    return (
      <AuthLayout>
        <div className="mx-auto flex min-h-[440px] w-full max-w-[440px] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface card-shadow lg:mx-0 lg:max-w-none">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-foreground-secondary">{t("auth.checking")}</p>
        </div>
      </AuthLayout>
    );
  }

  if (user) {
    const initial = (user.nickname || user.username).slice(0, 1).toUpperCase();
    return (
      <AuthLayout>
        <div className="mx-auto w-full max-w-[440px] rounded-lg border border-border bg-surface p-6 card-shadow sm:p-8 lg:mx-0 lg:max-w-none">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-xl font-bold text-primary-strong">
              {initial}
            </span>
            <h1 className="mt-4 text-2xl font-bold">{t("auth.signedInTitle")}</h1>
            <p className="mt-1 text-sm text-foreground-secondary">
              {user.nickname || user.username}
            </p>
            <p className="mt-3 text-xs leading-5 text-foreground-tertiary">
              {t("auth.signedInBody")}
            </p>
          </div>

          <div className="mt-6 space-y-2">
            {nextPath && (
              <Button className="h-10 w-full" asChild>
                <Link href={nextPath}>
                  {t("auth.continueTo")} {nextPath}
                </Link>
              </Button>
            )}
            <Button variant="outline" className="h-10 w-full" asChild>
              <Link href="/">{t("auth.backHome")}</Link>
            </Button>
            <Button
              variant="ghost"
              className="h-10 w-full text-foreground-secondary"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              {t("auth.signOut")}
            </Button>
          </div>

          <p className="mt-5 border-t border-border-light pt-4 text-xs leading-5 text-foreground-tertiary">
            {t("auth.comingSoon")}
          </p>
        </div>
      </AuthLayout>
    );
  }

  const isRegister = mode === "register";
  const inputTone = error ? "border-destructive" : "border-border";
  const inputClass = cn(
    "h-10 w-full rounded-md border bg-surface px-3 text-sm text-foreground outline-none transition-colors",
    "placeholder:text-foreground-tertiary focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60",
    inputTone,
  );

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-[440px] rounded-lg border border-border bg-surface p-6 card-shadow sm:p-8 lg:mx-0 lg:max-w-none">
        <h1 className="text-2xl font-bold tracking-tight">
          {t(isRegister ? "auth.titleRegister" : "auth.titleLogin")}
        </h1>

        <div
          role="tablist"
          aria-label="login or register"
          className="mt-5 flex rounded-md border border-border-light bg-surface-secondary p-1"
        >
          {(["login", "register"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={mode === item}
              onClick={() => switchMode(item)}
              className={cn(
                "flex-1 rounded-[6px] px-3 py-1.5 text-sm font-medium transition-colors",
                mode === item
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-foreground-secondary hover:text-foreground",
              )}
            >
              {t(item === "login" ? "auth.tabLogin" : "auth.tabRegister")}
            </button>
          ))}
        </div>

        {notice && (
          <div
            role="status"
            className="mt-4 flex items-start gap-2 rounded-md border border-primary/30 bg-primary-light px-3 py-2 text-xs leading-5 text-primary-strong"
          >
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium">
              {t("auth.username")}
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              className={inputClass}
              placeholder={t("auth.usernamePlaceholder")}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={loading}
              aria-invalid={Boolean(error)}
            />
          </div>

          <div className="mt-3 space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              {t("auth.password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              className={inputClass}
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              aria-invalid={Boolean(error)}
            />
          </div>

          {isRegister && (
            <div className="mt-3 space-y-1.5">
              <label htmlFor="confirm" className="text-sm font-medium">
                {t("auth.confirmPassword")}
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                className={inputClass}
                placeholder={t("auth.confirmPlaceholder")}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                disabled={loading}
                aria-invalid={Boolean(error)}
              />
            </div>
          )}

          <Button type="submit" className="mt-5 h-10 w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading
              ? t(isRegister ? "auth.submittingRegister" : "auth.submittingLogin")
              : t(isRegister ? "auth.submitRegister" : "auth.submitLogin")}
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-foreground-secondary">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("auth.metaKeep")}
          </span>
          <span>{t("auth.metaApp")}</span>
        </div>

        <div className="mt-5 text-center text-sm text-foreground-secondary">
          {t(isRegister ? "auth.switchToLogin" : "auth.switchToRegister")}{" "}
          <button
            type="button"
            onClick={() => switchMode(isRegister ? "login" : "register")}
            className="font-medium text-primary-strong hover:underline"
          >
            {t(isRegister ? "auth.switchLoginAction" : "auth.switchRegisterAction")}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}

/** 页面级布局：插画在左、表单在右，两栏高度随网格自动对齐 */
function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
      <AuthVisual />
      {children}
    </div>
  );
}

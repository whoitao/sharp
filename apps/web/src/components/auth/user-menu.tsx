"use client";

import { UserAvatar } from "@/components/account/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n";
import { notifySessionChanged, subscribeSession } from "@/lib/auth/client";
import {
  BarChart3,
  BookOpen,
  LogOut,
  NotebookPen,
  PawPrint,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface SessionUser {
  id: string;
  username: string;
  nickname: string | null;
  avatarUrl: string | null;
}

/**
 * 导航栏登录态：
 * 未登录显示「登录」按钮；已登录只显示头像，昵称与账号放在下拉菜单里。
 * 会话来自 httpOnly Cookie，这里只读取服务端返回的用户信息。
 */
export function UserMenu() {
  const { t } = useLocale();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let alive = true;

    const load = () => {
      fetch("/api/auth/session", { cache: "no-store" })
        .then((res) => res.json())
        .then((data: { user?: SessionUser | null }) => {
          if (alive) setUser(data.user ?? null);
        })
        .catch(() => {
          /* 读取失败按未登录处理 */
        });
    };

    load();
    const unsubscribe = subscribeSession(load);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* 网络失败时仍先清空本地视图 */
    }
    setUser(null);
    notifySessionChanged();
  }

  if (!user) {
    return (
      <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
        <Link href="/login">{t("nav.login")}</Link>
      </Button>
    );
  }

  const displayName = user.nickname || user.username;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={displayName}
          title={displayName}
          className="flex items-center rounded-full p-0.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <UserAvatar name={displayName} avatarUrl={user.avatarUrl} size="sm" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-2 py-1.5">
          <div className="truncate text-sm font-medium">{displayName}</div>
          <div className="truncate text-xs text-foreground-tertiary">
            @{user.username}
          </div>
        </div>
        <div className="my-1 h-px bg-border-light" />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserRound className="mr-2 h-4 w-4" />
            {t("account.profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/textbook">
            <BookOpen className="mr-2 h-4 w-4" />
            {t("nav.textbooks")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/pet">
            <PawPrint className="mr-2 h-4 w-4" />
            {t("pet.myPet")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/records">
            <BarChart3 className="mr-2 h-4 w-4" />
            {t("account.records")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/wrong-questions">
            <NotebookPen className="mr-2 h-4 w-4" />
            {t("account.wrongQuestions")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/settings">
            <Settings className="mr-2 h-4 w-4" />
            {t("account.settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          {t("auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

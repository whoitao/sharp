"use client";

import { RequireAuth } from "@/components/auth/require-auth";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { BarChart3, BookOpen, NotebookPen, PawPrint, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 个人中心外壳：标题 + 左侧 tab（个人信息 / 我的教材 / 学习记录 / 错题本 / 设置）+ 右侧内容。
 * 「个人信息」为默认 tab；退出登录只在右上角头像菜单里提供。
 */
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const pathname = usePathname();

  const onRecords = pathname.startsWith("/account/records");
  const onWrongQuestions = pathname.startsWith("/account/wrong-questions");
  const onSettings = pathname.startsWith("/account/settings");
  const onTextbook = pathname.startsWith("/account/textbook");
  const onPet = pathname.startsWith("/account/pet");
  const onProfile =
    !onRecords && !onWrongQuestions && !onSettings && !onTextbook && !onPet;

  const tabs = [
    {
      href: "/account",
      label: t("account.profile"),
      icon: UserRound,
      active: onProfile,
    },
    {
      href: "/account/textbook",
      label: t("account.myTextbook"),
      icon: BookOpen,
      active: onTextbook,
    },
    {
      href: "/account/pet",
      label: t("pet.myPet"),
      icon: PawPrint,
      active: onPet,
    },
    {
      href: "/account/records",
      label: t("account.records"),
      icon: BarChart3,
      active: onRecords,
    },
    {
      href: "/account/wrong-questions",
      label: t("account.wrongQuestions"),
      icon: NotebookPen,
      active: onWrongQuestions,
    },
    {
      href: "/account/settings",
      label: t("account.settings"),
      icon: Settings,
      active: onSettings,
    },
  ];

  return (
    <RequireAuth>
      <div className="w-full pb-16">
        <div className="grid gap-5 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-5">
          <aside className="min-w-0">
            <nav
              aria-label={t("account.menu")}
              className="flex flex-wrap gap-2 pb-1 md:flex-col md:gap-1 md:pb-0"
            >
              {tabs.map(({ href, label, icon: Icon, active }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors md:w-full",
                    active
                      ? "bg-primary-light text-primary-strong"
                      : "bg-surface text-foreground-secondary hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </RequireAuth>
  );
}

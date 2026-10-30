"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import Link from "next/link";

export default function NotFound() {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-6xl font-bold tracking-tighter">
        {t("notFound.title")}
      </h1>
      <p className="max-w-[500px] text-lg text-foreground-secondary">
        {t("notFound.description")}
      </p>
      <Link href="/">
        <Button className="mt-4">{t("common.backHome")}</Button>
      </Link>
    </div>
  );
}

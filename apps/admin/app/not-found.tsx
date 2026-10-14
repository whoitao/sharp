"use client";

import { Button, Result } from "antd";
import Link from "next/link";
import { useLocale } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useLocale();

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <Result
        status="404"
        title="404"
        subTitle={t("common.notFoundDesc")}
        extra={
          <Link href="/dashboard">
            <Button type="primary">{t("common.backHome")}</Button>
          </Link>
        }
      />
    </div>
  );
}

"use client";

import { HeaderTabs } from "@/components/header-tabs";
import { usePageTitle } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
import { useMemo, useState } from "react";
import AdminsPanel from "./AdminsPanel";
import UsersPanel from "./UsersPanel";

type TabKey = "admins" | "users";

export default function UsersPage() {
  const { t } = useLocale();
  const [activeKey, setActiveKey] = useState<TabKey>("admins");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "admins", label: t("nav.admins") },
    { key: "users", label: t("nav.users") },
  ];

  const headerTabs = useMemo(
    () => <HeaderTabs items={tabs} activeKey={activeKey} onChange={setActiveKey} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeKey, t],
  );

  usePageTitle(headerTabs);

  return activeKey === "admins" ? <AdminsPanel /> : <UsersPanel />;
}

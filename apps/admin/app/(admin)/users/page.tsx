"use client";

import { HeaderTabs } from "@/components/header-tabs";
import { usePageTitle } from "@/components/page-actions";
import { usePermissions } from "@/components/permissions";
import { useLocale } from "@/lib/i18n";
import { useEffect, useMemo, useState } from "react";
import AdminsPanel from "./AdminsPanel";
import RolesPanel from "./RolesPanel";
import UsersPanel from "./UsersPanel";

type TabKey = "admins" | "users" | "roles";

export default function UsersPage() {
  const { t } = useLocale();
  const { can, loading } = usePermissions();
  const [activeKey, setActiveKey] = useState<TabKey | null>(null);

  const tabs = useMemo(
    () =>
      [
        { key: "users" as TabKey, label: t("nav.users"), perm: "users:read" as const },
        { key: "admins" as TabKey, label: t("nav.admins"), perm: "admins:read" as const },
        { key: "roles" as TabKey, label: t("nav.roles"), perm: "roles:read" as const },
      ].filter((item) => can(item.perm)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [can, t]
  );

  useEffect(() => {
    if (loading) return;
    if (!activeKey || !tabs.some((item) => item.key === activeKey)) {
      // 默认落地「用户」；无该权限时回落到第一个可见页签
      const fallback = tabs.find((item) => item.key === "users")?.key ?? tabs[0]?.key ?? null;
      setActiveKey(fallback);
    }
  }, [loading, tabs, activeKey]);

  const headerTabs = useMemo(
    () => <HeaderTabs items={tabs} activeKey={activeKey ?? ""} onChange={(k) => setActiveKey(k as TabKey)} />,
    [tabs, activeKey]
  );

  usePageTitle(headerTabs);

  if (!loading && tabs.length === 0) {
    return <div style={{ padding: 24, opacity: 0.65 }}>{t("users.noPermission")}</div>;
  }

  if (activeKey === "admins") return <AdminsPanel />;
  if (activeKey === "roles") return <RolesPanel />;
  if (activeKey === "users") return <UsersPanel />;
  return null;
}

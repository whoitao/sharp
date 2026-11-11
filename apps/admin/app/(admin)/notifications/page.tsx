"use client";

import { usePageTitle } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
import { theme } from "antd";
import { useMemo, useState } from "react";
import MessagesPanel from "./MessagesPanel";
import TemplatesPanel from "./TemplatesPanel";

type TabKey = "messages" | "templates";

export default function NotificationsPage() {
  const { t } = useLocale();
  const { token } = theme.useToken();
  const [activeKey, setActiveKey] = useState<TabKey>("messages");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "messages", label: t("notifications.listTab") },
    { key: "templates", label: t("notifications.templatesTab") },
  ];

  const headerTabs = useMemo(
    () => (
      <div style={{ display: "flex", alignItems: "stretch", height: "100%", gap: 24 }}>
        {tabs.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <div
              key={tab.key}
              onClick={() => setActiveKey(tab.key)}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: active ? 600 : 400,
                color: active ? token.colorPrimary : token.colorTextSecondary,
                transition: "color 0.15s",
              }}
            >
              {tab.label}
              {active && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 2,
                    background: token.colorPrimary,
                    borderRadius: 1,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeKey, t, token.colorPrimary, token.colorTextSecondary],
  );

  usePageTitle(headerTabs);

  return activeKey === "messages" ? <MessagesPanel /> : <TemplatesPanel />;
}

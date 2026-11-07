"use client";

import { usePageTitle } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
import { theme } from "antd";
import { useMemo, useState } from "react";
import ArticlesPanel from "./ArticlesPanel";
import CategoriesPanel from "./CategoriesPanel";
import WikiPanel from "./WikiPanel";

type TabKey = "articles" | "categories" | "wiki";

export default function ArticlesPage() {
  const { t } = useLocale();
  const { token } = theme.useToken();
  const [activeKey, setActiveKey] = useState<TabKey>("articles");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "articles", label: t("articles.title") },
    { key: "categories", label: t("articleCategories.title") },
    { key: "wiki", label: t("wiki.title") },
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

  return activeKey === "articles" ? (
    <ArticlesPanel />
  ) : activeKey === "categories" ? (
    <CategoriesPanel />
  ) : (
    <WikiPanel />
  );
}

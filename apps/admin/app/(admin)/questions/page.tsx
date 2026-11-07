"use client";

import { HeaderTabs } from "@/components/header-tabs";
import { usePageTitle } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
import { useMemo, useState } from "react";
import KnowledgePointsPanel from "./KnowledgePointsPanel";
import QuestionsPanel from "./QuestionsPanel";
import TagsPanel from "./TagsPanel";
import FavoritesPanel from "./FavoritesPanel";

type TabKey = "questions" | "knowledgePoints" | "tags" | "favorites";

export default function QuestionsPage() {
  const { t } = useLocale();
  const [activeKey, setActiveKey] = useState<TabKey>("questions");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "questions", label: t("questions.title") },
    { key: "knowledgePoints", label: t("knowledgePoints.title") },
    { key: "tags", label: t("nav.tags") },
    { key: "favorites", label: t("favorites.title") },
  ];

  const headerTabs = useMemo(
    () => <HeaderTabs items={tabs} activeKey={activeKey} onChange={setActiveKey} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeKey, t],
  );

  usePageTitle(headerTabs);

  if (activeKey === "knowledgePoints") return <KnowledgePointsPanel />;
  if (activeKey === "tags") return <TagsPanel />;
  if (activeKey === "favorites") return <FavoritesPanel />;
  return <QuestionsPanel />;
}

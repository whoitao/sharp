"use client";

import { HeaderTabs } from "@/components/header-tabs";
import { usePageTitle } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
import { useMemo, useState } from "react";
import ChaptersPanel from "./ChaptersPanel";
import PublishersPanel from "./PublishersPanel";
import TextbooksPanel from "./TextbooksPanel";

type TabKey = "publishers" | "textbooks" | "chapters";

export default function TextbooksPage() {
  const { t } = useLocale();
  const [activeKey, setActiveKey] = useState<TabKey>("textbooks");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "publishers", label: t("nav.publishers") },
    { key: "textbooks", label: t("nav.textbooks") },
    { key: "chapters", label: t("nav.chapters") },
  ];

  const headerTabs = useMemo(
    () => <HeaderTabs items={tabs} activeKey={activeKey} onChange={setActiveKey} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeKey, t],
  );

  usePageTitle(headerTabs);

  if (activeKey === "publishers") return <PublishersPanel />;
  if (activeKey === "chapters") return <ChaptersPanel />;
  return <TextbooksPanel />;
}

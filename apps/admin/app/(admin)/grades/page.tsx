"use client";

import { HeaderTabs } from "@/components/header-tabs";
import { usePageTitle } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
import { useMemo, useState } from "react";
import GradesPanel from "./GradesPanel";
import StagesPanel from "./StagesPanel";

type TabKey = "stages" | "grades";

export default function GradesPage() {
  const { t } = useLocale();
  const [activeKey, setActiveKey] = useState<TabKey>("grades");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "grades", label: t("nav.grades") },
    { key: "stages", label: t("nav.stages") },
  ];

  const headerTabs = useMemo(
    () => <HeaderTabs items={tabs} activeKey={activeKey} onChange={setActiveKey} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeKey, t],
  );

  usePageTitle(headerTabs);

  return activeKey === "stages" ? <StagesPanel /> : <GradesPanel />;
}

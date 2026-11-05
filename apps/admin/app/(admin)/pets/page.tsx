"use client";

import { HeaderTabs } from "@/components/header-tabs";
import { usePageTitle } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
import { useMemo, useState } from "react";
import PetConfigPanel from "./PetConfigPanel";
import PetFeedsPanel from "./PetFeedsPanel";
import PetFoodsPanel from "./PetFoodsPanel";
import PetListPanel from "./PetListPanel";
import PetSpeciesPanel from "./PetSpeciesPanel";
import PetStagesPanel from "./PetStagesPanel";

type TabKey = "species" | "stages" | "pets" | "foods" | "feeds" | "config";

// 默认落地「宠物」页签（key: pets），页签顺序保持不变
const DEFAULT_TAB: TabKey = "pets";

export default function PetsPage() {
  const { t } = useLocale();
  const [activeKey, setActiveKey] = useState<TabKey>(DEFAULT_TAB);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "species", label: t("pets.tabSpecies") },
    { key: "stages", label: t("pets.tabStages") },
    { key: "pets", label: t("pets.tabPets") },
    { key: "foods", label: t("pets.tabFoods") },
    { key: "feeds", label: t("pets.tabFeeds") },
    { key: "config", label: t("pets.tabConfig") },
  ];

  const headerTabs = useMemo(
    () => <HeaderTabs items={tabs} activeKey={activeKey} onChange={setActiveKey} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeKey, t],
  );

  usePageTitle(headerTabs);

  if (activeKey === "stages") return <PetStagesPanel />;
  if (activeKey === "pets") return <PetListPanel />;
  if (activeKey === "foods") return <PetFoodsPanel />;
  if (activeKey === "feeds") return <PetFeedsPanel />;
  if (activeKey === "config") return <PetConfigPanel />;
  return <PetSpeciesPanel />;
}

"use client";

import { cn } from "@/lib/utils";

export interface ChipItem {
  key: string;
  label: string;
}

/**
 * 与移动端同一套两型胶囊行：
 * segment 靠浅强调底选中（口径分段），pill 铺在次级表面里、选中带描边（来源筛选）。
 */
export function ChipRow({
  items,
  active,
  onSelect,
  pill = false,
  label,
  gridClass,
}: {
  items: ChipItem[];
  active: string;
  onSelect: (key: string) => void;
  pill?: boolean;
  /** 屏幕阅读器用：这排胶囊在筛选什么 */
  label: string;
  /** 需要与下方网格逐列对齐时传入同一套列宽，否则等分 flex */
  gridClass?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        gridClass ?? "flex gap-1",
        pill && !gridClass && "rounded-full bg-surface-secondary p-1",
      )}
    >
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(item.key)}
            className={cn(
              "min-w-0 flex-1 truncate text-center text-xs transition-colors",
              pill
                ? cn(
                    "rounded-full border px-2 py-1",
                    selected
                      ? "border-border bg-surface font-semibold text-primary-strong"
                      : "border-transparent text-foreground-secondary hover:text-foreground",
                  )
                : cn(
                    "rounded-sm px-2 py-1.5",
                    selected
                      ? "bg-primary-light font-semibold text-primary-strong"
                      : "text-foreground-secondary hover:text-foreground",
                  ),
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

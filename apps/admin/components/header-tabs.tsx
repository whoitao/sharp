"use client";

import { theme } from "antd";
import type { ReactNode } from "react";

export type HeaderTabItem<K extends string = string> = {
  key: K;
  label: ReactNode;
};

// 顶栏 Tab 栏：与「文章管理」一致，用于替代页面标题
export function HeaderTabs<K extends string>({
  items,
  activeKey,
  onChange,
}: {
  items: HeaderTabItem<K>[];
  activeKey: K;
  onChange: (key: K) => void;
}) {
  const { token } = theme.useToken();

  return (
    <div style={{ display: "flex", alignItems: "stretch", height: "100%", gap: 24 }}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <div
            key={item.key}
            onClick={() => onChange(item.key)}
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
            {item.label}
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
  );
}

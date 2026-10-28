"use client";

import { SUBJECT_ICON_GLYPHS, isSubjectIconName } from "@/lib/ionicons";

interface IonIconProps {
  /** Ionicons 图标名，例如 calculator-outline */
  name?: string | null;
  size?: number;
  color?: string;
}

/**
 * 后台用 Ionicons 字体渲染图标，和移动端 <Ionicons /> 共用同一套字形，
 * 避免后台 antd 图标与 App 图标风格不一致。
 * 字体文件在 public/fonts/ionicons.ttf，样式见 globals.css。
 */
const IonIcon: React.FC<IonIconProps> = ({ name, size = 18, color }) => {
  if (!name) return null;
  if (!isSubjectIconName(name)) {
    // 兼容历史数据：不是合法图标名时按普通文本展示（例如以前存的 emoji）
    return <span style={{ fontSize: size, lineHeight: 1, color }}>{name}</span>;
  }
  return (
    <span
      className="ionicon"
      aria-hidden
      style={{ fontSize: size, lineHeight: 1, color }}
    >
      {String.fromCodePoint(SUBJECT_ICON_GLYPHS[name])}
    </span>
  );
};

export default IonIcon;

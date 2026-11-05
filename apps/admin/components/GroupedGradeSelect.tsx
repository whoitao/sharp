"use client";

import { UnorderedListOutlined } from "@ant-design/icons";
import { Select } from "antd";
import type { SelectProps } from "antd";

export interface GradeOption {
  id: string;
  name: string;
  stage?: string | null;
}

/**
 * 年级按学段分组：保持接口返回的学段顺序与组内年级顺序，
 * Dashboard 与问题列表共用，避免两套分组逻辑漂移。
 */
export function groupGradesByStage(grades: GradeOption[]) {
  const map = new Map<string, { value: string; label: string }[]>();
  for (const grade of grades) {
    const key = grade.stage || "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({ value: grade.id, label: grade.name });
  }
  return Array.from(map, ([stage, options]) => ({ label: stage, options }));
}

type GroupedGradeSelectProps = Omit<SelectProps, "options"> & {
  grades: GradeOption[];
  iconColor?: string;
};

export default function GroupedGradeSelect({
  grades,
  iconColor,
  ...rest
}: GroupedGradeSelectProps) {
  return (
    <Select
      allowClear
      prefix={<UnorderedListOutlined style={{ color: iconColor }} />}
      options={groupGradesByStage(grades)}
      {...rest}
    />
  );
}

"use client";

import IonIcon from "@/components/IonIcon";
import { useLocale } from "@/lib/i18n";
import { Select, type SelectProps } from "antd";
import { useCallback, useEffect, useState } from "react";

export interface SubjectOption {
  id: string;
  name: string;
  icon?: string | null;
}

interface SubjectSelectOption {
  value: string;
  label: string;
  icon?: string | null;
}

const AUTH_TOKEN_KEY = "admin_token";
const SUBJECTS_URL = "/api/admin/subjects";

let _cache: SubjectOption[] | null = null;
let _loadingPromise: Promise<SubjectOption[]> | null = null;

async function fetchSubjects(): Promise<SubjectOption[]> {
  if (_cache) return _cache;
  if (_loadingPromise) return _loadingPromise;
  _loadingPromise = (async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY) ?? "";
    const res = await fetch(SUBJECTS_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to load subjects: ${res.status}`);
    const data = await res.json();
    _cache = Array.isArray(data) ? (data as SubjectOption[]) : [];
    _loadingPromise = null;
    return _cache;
  })();
  return _loadingPromise;
}

export function useSubjects() {
  const [subjects, setSubjects] = useState<SubjectOption[]>(_cache ?? []);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    let cancelled = false;
    fetchSubjects()
      .then((data) => { if (!cancelled) setSubjects(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const reload = useCallback(async () => {
    _cache = null;
    setLoading(true);
    try {
      const data = await fetchSubjects();
      setSubjects(data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  return { subjects, loading, reload };
}

export interface SubjectSelectProps
  extends Omit<SelectProps<string, SubjectSelectOption>, "options"> {
  /** 外部已加载的 subjects 数据，传入后跳过内部 fetch */
  subjects?: SubjectOption[];
  /** 允许搜索，默认 true */
  showSearch?: boolean;
  /** 允许清空，默认 false */
  allowClear?: boolean;
  /** 图标颜色（CSS color），默认 antd 主色 */
  iconColor?: string;
}

/**
 * 科目下拉框公共组件：带图标前缀的 optionRender + labelRender，
 * 内部自动 fetch /api/admin/subjects，也可通过 subjects prop 注入外部数据。
 */
export default function SubjectSelect({
  subjects: externalSubjects,
  showSearch = true,
  allowClear = false,
  iconColor = "var(--ant-primary-color)",
  placeholder,
  loading: externalLoading,
  ...rest
}: SubjectSelectProps) {
  const { t } = useLocale();
  const { subjects: internalSubjects, loading: internalLoading } = useSubjects();
  const subjects = externalSubjects ?? internalSubjects;
  const loading = externalLoading ?? internalLoading;

  const options: SubjectSelectOption[] = subjects.map((s) => ({
    value: s.id,
    label: s.name,
    icon: s.icon,
  }));

  const renderOption = (opt: any) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <IonIcon name={opt.data?.icon} size={18} color={iconColor} />
      {opt.label}
    </span>
  );

  const renderLabel = (opt: any) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <IonIcon name={opt.icon} size={16} color={iconColor} />
      {opt.label}
    </span>
  );

  return (
    <Select
      showSearch={showSearch}
      allowClear={allowClear}
      placeholder={placeholder ?? t("common.selectSubject")}
      loading={loading}
      options={options}
      optionFilterProp="label"
      optionRender={renderOption}
      labelRender={renderLabel}
      {...rest}
    />
  );
}

/** 清空 subjects 缓存，科目 CRUD 后调用 */
export function invalidateSubjectsCache() {
  _cache = null;
}

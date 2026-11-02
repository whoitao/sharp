"use client";

import { useThemeMode } from "@/components/antd-providers";
import IonIcon from "@/components/IonIcon";
import { useLocale } from "@/lib/i18n";
import {
  AimOutlined,
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  HistoryOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import {
  App,
  Col,
  ConfigProvider,
  Empty,
  Row,
  Segmented,
  Select,
  Table,
  theme as antdTheme,
  type TableProps,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

interface TrendPoint {
  date: string;
  questions: number;
  duration: number;
  sessions: number;
}

interface NameStat {
  id: string;
  name: string;
  attempts: number;
  questions: number;
  accuracy: number;
}

interface RecentItem {
  id: string;
  user: string;
  scope: string;
  chapterName: string | null;
  subjectName: string | null;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  finishedAt: string;
}

interface StatsData {
  kpis: {
    attempts: number;
    questions: number;
    accuracy: number;
    activeUsers: number;
    duration: number;
  };
  trend: TrendPoint[];
  chapters: NameStat[];
  knowledgePoints: NameStat[];
  recent: RecentItem[];
}

interface Option {
  id: string;
  name: string;
  icon?: string | null;
}

interface GradeOption extends Option {
  stage?: string;
}

const DAY_OPTIONS = [7, 14, 30];

// 与移动端 apps/mobile/src/theme/colors.ts 保持同一套色值：
// 浅色绿调白底、深色墨绿底，避免两端主题观感割裂。
const MOBILE_LIGHT = {
  background: "#F2F8F5",
  surface: "#FFFFFF",
  surfaceSecondary: "#F7FBF9",
  text: "#10231A",
  textSecondary: "#4F6B5E",
  textTertiary: "#5C7268",
  border: "#DDE7E1",
  borderLight: "#EDF3F0",
  accent: "#10B981",
  accentStrong: "#0B7F58",
  accentLight: "#DDF6EA",
  warning: "#B45309",
  warningLight: "#FEF3C7",
  error: "#C62828",
  errorLight: "#FDECEC",
};

const MOBILE_DARK = {
  background: "#0B1512",
  surface: "#14201B",
  surfaceSecondary: "#1B2A23",
  text: "#F2F7F4",
  textSecondary: "#A6BAB0",
  textTertiary: "#93A99F",
  border: "#27362F",
  borderLight: "#1F2E27",
  accent: "#34D399",
  accentStrong: "#34D399",
  accentLight: "#123B2C",
  warning: "#FBBF24",
  warningLight: "#3A2E12",
  error: "#FCA5A5",
  errorLight: "#3A1D1D",
};

type Palette = typeof MOBILE_LIGHT;

function SectionCard({
  title,
  extra,
  palette,
  isDark,
  bodyStyle,
  style,
  children,
}: {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  palette: Palette;
  isDark: boolean;
  bodyStyle?: React.CSSProperties;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        boxShadow: isDark ? "none" : "0 1px 2px rgba(16, 35, 26, 0.05)",
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "11px 16px",
            borderBottom: `1px solid ${palette.borderLight}`,
            fontSize: 14,
            fontWeight: 600,
            color: palette.text,
          }}
        >
          <span>{title}</span>
          {extra}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, padding: 16, ...bodyStyle }}>{children}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { message } = App.useApp();
  const { locale, t } = useLocale();
  const { resolved } = useThemeMode();
  const isDark = resolved === "dark";
  const palette: Palette = isDark ? MOBILE_DARK : MOBILE_LIGHT;

  const [days, setDays] = useState(14);
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [grades, setGrades] = useState<GradeOption[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const authToken = localStorage.getItem("admin_token");
    const params = new URLSearchParams({ days: String(days) });
    if (gradeId) params.set("gradeId", gradeId);
    if (subjectId) params.set("subjectId", subjectId);
    try {
      const res = await fetch(`/api/admin/stats?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const body = await res.json();
      if (res.ok && body?.kpis) setData(body);
      else setData(null);
    } catch {
      setData(null);
      message.error(t("stats.loadFailed"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, gradeId, subjectId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const authToken = localStorage.getItem("admin_token");
    const headers = { Authorization: `Bearer ${authToken}` };
    Promise.all([
      fetch("/api/admin/grades", { headers }).then((r) => r.json()),
      fetch("/api/admin/subjects", { headers }).then((r) => r.json()),
    ])
      .then(([gradeList, subjectList]) => {
        if (Array.isArray(gradeList)) setGrades(gradeList);
        if (Array.isArray(subjectList)) setSubjects(subjectList);
      })
      .catch(() => undefined);
  }, []);

  // 年级按学段分组展示（小学 / 初中 / 高中 / 大学）
  const gradeGroups = useMemo(() => {
    const groups = new Map<string, { value: string; label: string }[]>();
    grades.forEach((grade) => {
      const key = grade.stage || "";
      const list = groups.get(key) ?? [];
      list.push({ value: grade.id, label: grade.name });
      groups.set(key, list);
    });
    return Array.from(groups.entries()).map(([stage, options]) => ({ label: stage, options }));
  }, [grades]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const todaySessions = data?.trend.at(-1)?.sessions ?? 0;

  const kpis = data
    ? [
        {
          label: t("stats.kpiAttempts"),
          value: data.kpis.attempts.toLocaleString(),
          icon: <HistoryOutlined />,
        },
        {
          label: t("stats.kpiQuestions"),
          value: data.kpis.questions.toLocaleString(),
          icon: <FileTextOutlined />,
        },
        {
          label: t("stats.kpiAccuracy"),
          value: `${data.kpis.accuracy}%`,
          icon: <AimOutlined />,
        },
        {
          label: t("stats.kpiActiveUsers"),
          value: data.kpis.activeUsers.toLocaleString(),
          icon: <TeamOutlined />,
        },
        {
          label: t("stats.kpiDuration"),
          value: formatDuration(data.kpis.duration),
          icon: <ClockCircleOutlined />,
        },
        {
          label: t("stats.kpiTodaySessions"),
          value: todaySessions.toLocaleString(),
          icon: <CalendarOutlined />,
        },
      ]
    : [];

  const maxQuestions = Math.max(1, ...(data?.trend.map((point) => point.questions) ?? [0]));

  const nameColumns: TableProps<NameStat>["columns"] = [
    { title: t("stats.colName"), dataIndex: "name", key: "name", ellipsis: true },
    { title: t("stats.colAttempts"), dataIndex: "attempts", key: "attempts", width: 80 },
    { title: t("stats.colQuestions"), dataIndex: "questions", key: "questions", width: 80 },
    {
      title: t("stats.colAccuracy"),
      dataIndex: "accuracy",
      key: "accuracy",
      width: 80,
      render: (value: number) => `${value}%`,
    },
  ];

  const scopeLabel = (scope: string) => {
    if (scope === "chapter") return t("stats.scopeChapter");
    if (scope === "knowledge") return t("stats.scopeKnowledge");
    return t("stats.scopeBank");
  };

  const formatRecentTime = (value: string) =>
    new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const accuracyTone = (accuracy: number) => {
    if (accuracy >= 80) return { bg: palette.accentLight, fg: palette.accentStrong };
    if (accuracy >= 60) return { bg: palette.warningLight, fg: palette.warning };
    return { bg: palette.errorLight, fg: palette.error };
  };

  const dashboardTheme = useMemo(
    () => ({
      algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: palette.accent,
        colorInfo: palette.accent,
        colorLink: palette.accentStrong,
        colorBgContainer: palette.surface,
        colorBgElevated: palette.surface,
        colorBgLayout: palette.background,
        colorBgSpotlight: palette.surfaceSecondary,
        colorBorder: palette.border,
        colorBorderSecondary: palette.borderLight,
        colorText: palette.text,
        colorTextSecondary: palette.textSecondary,
        colorTextTertiary: palette.textTertiary,
        colorTextQuaternary: palette.textTertiary,
        colorFillSecondary: palette.surfaceSecondary,
        colorFillTertiary: palette.surfaceSecondary,
        borderRadius: 10,
        borderRadiusLG: 12,
        fontSize: 13,
      },
      components: {
        Segmented: {
          trackBg: palette.surfaceSecondary,
          itemColor: palette.textSecondary,
          itemSelectedBg: palette.surface,
          itemSelectedColor: palette.accentStrong,
        },
        Table: {
          headerBg: palette.surfaceSecondary,
          headerColor: palette.textSecondary,
          headerSplitColor: "transparent",
          rowHoverBg: palette.surfaceSecondary,
          borderColor: palette.borderLight,
        },
        Select: {
          optionSelectedBg: palette.accentLight,
          optionSelectedColor: palette.accentStrong,
        },
        Empty: {
          colorTextDescription: palette.textTertiary,
        },
      },
    }),
    [palette, isDark],
  );

  const trendLabelStep = Math.max(1, Math.ceil((data?.trend.length ?? 0) / 10));

  return (
    <ConfigProvider theme={dashboardTheme}>
      <div
        style={{
          margin: -8,
          padding: 16,
          minHeight: "calc(100vh - 50px)",
          background: palette.background,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <Segmented
            value={days}
            onChange={(value) => setDays(value as number)}
            options={DAY_OPTIONS.map((value) => ({
              value,
              label: t(`stats.days${value}` as "stats.days7"),
            }))}
          />
          <Select
            allowClear
            style={{ width: 170 }}
            prefix={<UnorderedListOutlined style={{ color: palette.textTertiary }} />}
            placeholder={t("stats.allGrades")}
            value={gradeId}
            onChange={(value) => setGradeId(value ?? null)}
            options={gradeGroups}
          />
          <Select
            allowClear
            style={{ width: 170 }}
            prefix={<BookOutlined style={{ color: palette.textTertiary }} />}
            placeholder={t("stats.allSubjects")}
            value={subjectId}
            onChange={(value) => setSubjectId(value ?? null)}
            options={subjects.map((subject) => ({
              value: subject.id,
              label: subject.name,
              icon: subject.icon,
            }))}
            optionRender={(opt: any) => (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <IonIcon name={opt.data?.icon} size={18} color={palette.accentStrong} />
                {opt.label}
              </span>
            )}
            labelRender={(opt: any) => (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <IonIcon name={opt.icon} size={16} color={palette.accentStrong} />
                {opt.label}
              </span>
            )}
          />
        </div>

        {!data && !loading ? (
          <SectionCard palette={palette} isDark={isDark} bodyStyle={{ padding: 48 }}>
            <Empty description={t("stats.empty")} />
          </SectionCard>
        ) : (
          <Row gutter={[12, 12]}>
            {kpis.map((kpi) => (
              <Col key={kpi.label} xs={12} sm={8} xl={4}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    height: "100%",
                    padding: "14px 16px",
                    background: palette.surface,
                    border: `1px solid ${palette.border}`,
                    borderRadius: 12,
                    boxShadow: isDark ? "none" : "0 1px 2px rgba(16, 35, 26, 0.05)",
                    opacity: loading && !data ? 0.6 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 34,
                      height: 34,
                      flex: "0 0 auto",
                      borderRadius: 10,
                      background: palette.accentLight,
                      color: palette.accentStrong,
                      fontSize: 16,
                    }}
                  >
                    {kpi.icon}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 21,
                        fontWeight: 700,
                        lineHeight: 1.15,
                        color: palette.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {kpi.value}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 12,
                        color: palette.textSecondary,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {kpi.label}
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        )}

        {data && (
          <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
            <Col xs={24} xl={14}>
              <SectionCard
                palette={palette}
                isDark={isDark}
                style={{ height: "100%" }}
                title={t("stats.trendTitle")}
                extra={
                  <span style={{ fontSize: 12, fontWeight: 400, color: palette.textTertiary }}>
                    {data.kpis.attempts} {t("stats.kpiAttempts")}
                  </span>
                }
                bodyStyle={{ padding: "16px 16px 10px" }}
              >
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 170 }}>
                  {data.trend.map((point, index) => {
                    const hasData = point.questions > 0;
                    const barHeight = hasData
                      ? Math.max(6, Math.round((point.questions / maxQuestions) * 140))
                      : 3;
                    const showLabel = index % trendLabelStep === 0 || index === data.trend.length - 1;
                    return (
                      <div key={point.date} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
                        <div
                          title={`${point.date} · ${point.questions} ${t("stats.trendQuestions")} · ${point.sessions} ${t("stats.trendSessions")}`}
                          style={{
                            height: barHeight,
                            marginBottom: 6,
                            borderRadius: "4px 4px 2px 2px",
                            background: hasData
                              ? `linear-gradient(180deg, ${palette.accent}, ${palette.accentStrong})`
                              : palette.borderLight,
                          }}
                        />
                        <div
                          style={{
                            fontSize: 10,
                            color: palette.textTertiary,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {showLabel ? point.date.slice(5) : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            </Col>
            <Col xs={24} xl={10}>
              <SectionCard
                palette={palette}
                isDark={isDark}
                style={{ height: "100%" }}
                title={t("stats.recentTitle")}
                bodyStyle={{ padding: "4px 16px 8px" }}
              >
                {data.recent.length === 0 ? (
                  <Empty description={t("stats.empty")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <div style={{ maxHeight: 224, overflowY: "auto" }}>
                    {data.recent.map((item) => {
                      const answered = item.correctCount + item.wrongCount;
                      const accuracy =
                        answered > 0 ? Math.round((item.correctCount / answered) * 100) : null;
                      const tone = accuracy === null ? null : accuracyTone(accuracy);
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 0",
                            borderBottom: `1px solid ${palette.borderLight}`,
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 26,
                              height: 26,
                              flex: "0 0 auto",
                              borderRadius: "50%",
                              background: palette.accentLight,
                              color: palette.accentStrong,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {item.user.slice(0, 1).toUpperCase()}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: palette.text,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {item.chapterName || scopeLabel(item.scope)}
                            </div>
                            <div
                              style={{
                                marginTop: 1,
                                fontSize: 11,
                                color: palette.textTertiary,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {item.user} · {item.totalQuestions} {t("stats.colQuestions")} ·{" "}
                              {formatRecentTime(item.finishedAt)}
                            </div>
                          </div>
                          <span
                            style={{
                              flex: "0 0 auto",
                              padding: "2px 8px",
                              borderRadius: 10,
                              fontSize: 12,
                              fontWeight: 600,
                              background: tone?.bg ?? palette.surfaceSecondary,
                              color: tone?.fg ?? palette.textTertiary,
                            }}
                          >
                            {accuracy === null ? "-" : `${accuracy}%`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </Col>
          </Row>
        )}

        <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
          <Col xs={24} xl={12}>
            <SectionCard
              palette={palette}
              isDark={isDark}
              style={{ height: "100%" }}
              title={t("stats.chaptersTitle")}
              bodyStyle={{ padding: "4px 8px 8px" }}
            >
              <Table<NameStat>
                rowKey="id"
                size="small"
                loading={loading}
                columns={nameColumns}
                dataSource={data?.chapters ?? []}
                pagination={false}
                locale={{ emptyText: t("stats.empty") }}
              />
            </SectionCard>
          </Col>
          <Col xs={24} xl={12}>
            <SectionCard
              palette={palette}
              isDark={isDark}
              style={{ height: "100%" }}
              title={t("stats.knowledgeTitle")}
              bodyStyle={{ padding: "4px 8px 8px" }}
            >
              <Table<NameStat>
                rowKey="id"
                size="small"
                loading={loading}
                columns={nameColumns}
                dataSource={data?.knowledgePoints ?? []}
                pagination={false}
                locale={{ emptyText: t("stats.empty") }}
              />
            </SectionCard>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
}

"use client";

import {
  AimOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  HistoryOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useLocale } from "@/lib/i18n";
import {
  App,
  Card,
  Col,
  Empty,
  Row,
  Select,
  Segmented,
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
}

interface GradeOption extends Option {
  stage?: string;
}

const DAY_OPTIONS = [7, 14, 30];

export default function DashboardPage() {
  const { message } = App.useApp();
  const { locale, t } = useLocale();
  const { token } = antdTheme.useToken();

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
      ]
    : [];

  const maxQuestions = Math.max(1, ...(data?.trend.map((point) => point.questions) ?? [0]));

  const nameColumns: TableProps<NameStat>["columns"] = [
    { title: t("stats.colName"), dataIndex: "name", key: "name" },
    { title: t("stats.colAttempts"), dataIndex: "attempts", key: "attempts", width: 100 },
    { title: t("stats.colQuestions"), dataIndex: "questions", key: "questions", width: 100 },
    {
      title: t("stats.colAccuracy"),
      dataIndex: "accuracy",
      key: "accuracy",
      width: 100,
      render: (value: number) => `${value}%`,
    },
  ];

  const scopeLabel = (scope: string) => {
    if (scope === "chapter") return t("stats.scopeChapter");
    if (scope === "knowledge") return t("stats.scopeKnowledge");
    return t("stats.scopeBank");
  };

  const recentColumns: TableProps<RecentItem>["columns"] = [
    { title: t("stats.colUser"), dataIndex: "user", key: "user" },
    {
      title: t("stats.colScope"),
      dataIndex: "scope",
      key: "scope",
      render: (value: string, record) => record.chapterName || scopeLabel(value),
    },
    { title: t("stats.colQuestions"), dataIndex: "totalQuestions", key: "totalQuestions", width: 100 },
    {
      title: t("stats.colAccuracy"),
      key: "accuracy",
      width: 100,
      render: (_, record) => {
        const answered = record.correctCount + record.wrongCount;
        return answered > 0 ? `${Math.round((record.correctCount / answered) * 100)}%` : "-";
      },
    },
    {
      title: t("stats.colFinished"),
      dataIndex: "finishedAt",
      key: "finishedAt",
      width: 180,
      render: (value: string) =>
        new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US"),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
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
          style={{ width: 160 }}
          placeholder={t("stats.allGrades")}
          value={gradeId}
          onChange={(value) => setGradeId(value ?? null)}
          options={gradeGroups}
        />
        <Select
          allowClear
          style={{ width: 160 }}
          placeholder={t("stats.allSubjects")}
          value={subjectId}
          onChange={(value) => setSubjectId(value ?? null)}
          options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
        />
      </div>

      {!data && !loading ? (
        <Empty description={t("stats.empty")} />
      ) : (
        <Row gutter={[12, 12]}>
          {kpis.map((kpi) => (
            <Col key={kpi.label} xs={12} sm={8} lg={24 / 5}>
              <Card loading={loading} styles={{ body: { padding: 16 } }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20, color: token.colorPrimary, lineHeight: 1 }}>
                    {kpi.icon}
                  </span>
                  <div style={{ fontSize: 24, fontWeight: 700, color: token.colorText }}>
                    {kpi.value}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: token.colorTextSecondary, marginTop: 2 }}>{kpi.label}</div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {data && (
        <Card
          title={t("stats.trendTitle")}
          size="small"
          style={{ marginTop: 12 }}
          styles={{ body: { padding: "16px 16px 8px" } }}
        >
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 150 }}>
            {data.trend.map((point) => (
              <div key={point.date} style={{ flex: 1, textAlign: "center", minWidth: 0 }}>
                <div
                  title={`${point.date} · ${point.questions} ${t("stats.trendQuestions")} · ${point.sessions} ${t("stats.trendSessions")}`}
                  style={{
                    height: Math.max(2, Math.round((point.questions / maxQuestions) * 120)),
                    background: token.colorPrimary,
                    borderRadius: 3,
                    marginBottom: 4,
                  }}
                />
                <div
                  style={{
                    fontSize: 10,
                    color: token.colorTextTertiary,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {point.date.slice(5)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} xl={12}>
          <Card title={t("stats.chaptersTitle")} size="small">
            <Table<NameStat>
              rowKey="id"
              size="small"
              loading={loading}
              columns={nameColumns}
              dataSource={data?.chapters ?? []}
              pagination={false}
              locale={{ emptyText: t("stats.empty") }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title={t("stats.knowledgeTitle")} size="small">
            <Table<NameStat>
              rowKey="id"
              size="small"
              loading={loading}
              columns={nameColumns}
              dataSource={data?.knowledgePoints ?? []}
              pagination={false}
              locale={{ emptyText: t("stats.empty") }}
            />
          </Card>
        </Col>
      </Row>

      <Card title={t("stats.recentTitle")} size="small" style={{ marginTop: 12 }}>
        <Table<RecentItem>
          rowKey="id"
          size="small"
          loading={loading}
          columns={recentColumns}
          dataSource={data?.recent ?? []}
          pagination={false}
          locale={{ emptyText: t("stats.empty") }}
        />
      </Card>
    </div>
  );
}

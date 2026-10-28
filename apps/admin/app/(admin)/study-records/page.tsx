"use client";

import { useLocale } from "@/lib/i18n";
import { Input, Table, theme as antdTheme } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";

interface StudyRecord {
  id: string;
  user: {
    username: string;
    nickname: string | null;
  };
  categoryId: string;
  categoryName: string | null;
  unitIndex: number;
  startedAt: string;
  finishedAt: string | null;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
}

interface PaginatedData {
  data: StudyRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

export default function StudyRecordsPage() {
  const { token } = antdTheme.useToken();
  const { locale, t } = useLocale();
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRecords = async (p: number, s: string) => {
    setLoading(true);
    const authToken = localStorage.getItem("admin_token");
    const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
    if (s) params.set("search", s);

    try {
      const res = await fetch(`/api/admin/study-records?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data: PaginatedData = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setRecords(data.data);
        setTotal(data.total ?? 0);
        setPage(data.page ?? p);
      } else {
        setRecords([]);
        setTotal(0);
      }
    } catch {
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchRecords(1, value);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";

  const columns: ColumnsType<StudyRecord> = [
    {
      title: t("studyRecords.colUser"),
      key: "user",
      render: (_, record) => (
        <strong>{record.user.nickname || record.user.username}</strong>
      ),
    },
    {
      title: t("studyRecords.colCategory"),
      key: "categoryName",
      render: (_, record) => record.categoryName ?? t("studyRecords.unknownCategory"),
    },
    {
      title: t("studyRecords.colUnit"),
      dataIndex: "unitIndex",
      key: "unitIndex",
      render: (value: number) => t("studyRecords.unit", { n: value + 1 }),
    },
    {
      title: t("studyRecords.colStarted"),
      dataIndex: "startedAt",
      key: "startedAt",
      render: (value: string) => new Date(value).toLocaleString(dateLocale),
    },
    {
      title: t("studyRecords.colFinished"),
      dataIndex: "finishedAt",
      key: "finishedAt",
      render: (value: string | null) =>
        value ? new Date(value).toLocaleString(dateLocale) : t("studyRecords.inProgress"),
    },
    { title: t("studyRecords.colQuestions"), dataIndex: "totalQuestions", key: "totalQuestions" },
    {
      title: t("studyRecords.colCorrect"),
      dataIndex: "correctCount",
      key: "correctCount",
      render: (value: number) => <span style={{ color: token.colorSuccessText }}>{value}</span>,
    },
    {
      title: t("studyRecords.colWrong"),
      dataIndex: "wrongCount",
      key: "wrongCount",
      render: (value: number) => <span style={{ color: token.colorErrorText }}>{value}</span>,
    },
    {
      title: t("studyRecords.colDuration"),
      dataIndex: "durationSeconds",
      key: "durationSeconds",
      render: (value: number) => formatDuration(value),
    },
  ];

  return (
    <div>
      <Input.Search
        allowClear
        placeholder={t("studyRecords.searchPlaceholder")}
        style={{ width: 320, marginBottom: 10 }}
        onSearch={handleSearch}
      />

      <Table<StudyRecord>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={records}
        scroll={{ x: "max-content" }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          showTotal: (n) => t("common.total", { n }),
          onChange: (p) => fetchRecords(p, search),
        }}
      />
    </div>
  );
}

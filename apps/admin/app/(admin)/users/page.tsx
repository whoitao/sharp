"use client";

import { useLocale } from "@/lib/i18n";
import { Button, Input, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";

interface User {
  id: string;
  username: string;
  nickname: string | null;
  status: string;
  createdAt: string;
  _count?: {
    studyRecords: number;
  };
}

interface PaginatedData {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

export default function UsersPage() {
  const { locale, t } = useLocale();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchUsers = async (p: number, s: string) => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
    if (s) params.set("search", s);

    try {
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: PaginatedData = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setUsers(data.data);
        setTotal(data.total ?? 0);
        setPage(data.page ?? p);
      } else {
        setUsers([]);
        setTotal(0);
      }
    } catch {
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchUsers(1, value);
  };

  const toggleUserStatus = async (user: User) => {
    setTogglingId(user.id);
    const token = localStorage.getItem("admin_token");
    const newStatus = user.status === "active" ? "disabled" : "active";
    try {
      await fetch(`/api/admin/users/${user.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchUsers(page, search);
    } finally {
      setTogglingId(null);
    }
  };

  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";

  const columns: ColumnsType<User> = [
    {
      title: t("users.colUsername"),
      dataIndex: "username",
      key: "username",
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: t("users.colNickname"),
      dataIndex: "nickname",
      key: "nickname",
      render: (value: string | null) => value || "-",
    },
    {
      title: t("users.colStatus"),
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={status === "active" ? "success" : "error"}>
          {status === "active" ? t("users.statusActive") : t("users.statusDisabled")}
        </Tag>
      ),
    },
    {
      title: t("users.colStudyRecords"),
      key: "studyRecords",
      render: (_, record) => record._count?.studyRecords ?? 0,
    },
    {
      title: t("users.colCreatedAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => new Date(value).toLocaleDateString(dateLocale),
    },
    {
      title: t("users.colActions"),
      key: "actions",
      align: "right",
      render: (_, record) => (
        <Button
          size="small"
          loading={togglingId === record.id}
          onClick={() => toggleUserStatus(record)}
        >
          {record.status === "active" ? t("users.disable") : t("users.enable")}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{t("users.title")}</h1>
        <span style={{ opacity: 0.55 }}>{t("common.total", { n: total })}</span>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder={t("users.searchPlaceholder")}
          style={{ width: 320 }}
          onSearch={handleSearch}
        />
      </Space>

      <Table<User>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={users}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          showTotal: (n) => t("common.total", { n }),
          onChange: (p) => fetchUsers(p, search),
        }}
      />
    </div>
  );
}

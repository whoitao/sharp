"use client";

import { usePageSize } from "@/components/antd-providers";
import { useLocale } from "@/lib/i18n";
import { Input, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";

interface AdminItem {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

interface PaginatedData {
  data: AdminItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AdminsPage() {
  const { locale, t } = useLocale();
  const { pageSize } = usePageSize();
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAdmins = async (p: number, s: string, size: number) => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    const params = new URLSearchParams({ page: String(p), pageSize: String(size) });
    if (s) params.set("search", s);

    try {
      const res = await fetch(`/api/admin/admins?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: PaginatedData = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setAdmins(data.data);
        setTotal(data.total ?? 0);
        setPage(data.page ?? p);
      } else {
        setAdmins([]);
        setTotal(0);
      }
    } catch {
      setAdmins([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins(1, "", pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAdmins(1, search, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchAdmins(1, value, pageSize);
  };

  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";

  const columns: ColumnsType<AdminItem> = [
    {
      title: t("admins.colUsername"),
      dataIndex: "username",
      key: "username",
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: t("admins.colRole"),
      dataIndex: "role",
      key: "role",
      render: (role: string) => <Tag color={role === "super" ? "gold" : "geekblue"}>{role}</Tag>,
    },
    {
      title: t("admins.colCreatedAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => new Date(value).toLocaleString(dateLocale),
    },
  ];

  return (
    <div style={{ marginTop: -8 }}>
      <Input.Search
        allowClear
        placeholder={t("admins.searchPlaceholder")}
        style={{ width: 320, marginBottom: 10 }}
        onSearch={handleSearch}
      />

      <Table<AdminItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={admins}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (n) => t("common.total", { n }),
          onChange: (p) => fetchAdmins(p, search, pageSize),
        }}
      />
    </div>
  );
}

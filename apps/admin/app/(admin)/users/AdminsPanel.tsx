"use client";

import { usePageSize } from "@/components/antd-providers";
import { usePermissions } from "@/components/permissions";
import { useLocale } from "@/lib/i18n";
import { App, Input, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";

interface AdminItem {
  id: string;
  username: string;
  role: string;
  roleName?: string;
  roleId?: string | null;
  createdAt: string;
}

interface RoleOption {
  id: string;
  code: string;
  name: string;
}

interface PaginatedData {
  data: AdminItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function AdminsPanel() {
  const { locale, t } = useLocale();
  const { pageSize } = usePageSize();
  const { can, identity } = usePermissions();
  const { message } = App.useApp();
  const canWrite = can("admins:write");
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/admin/roles", {
        headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.data)) {
        setRoleOptions(data.data.map((r: RoleOption) => ({ id: r.id, code: r.code, name: r.name })));
      }
    } catch {
      // 无权查看角色时静默降级为只读展示
    }
  };

  const changeRole = async (id: string, roleId: string) => {
    try {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roleId }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success("角色已更新");
        fetchAdmins(page, search, pageSize);
      } else {
        message.error(data.error ?? "更新失败");
      }
    } catch {
      message.error("更新失败");
    }
  };

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
    fetchRoles();
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
      render: (role: string, row) => {
        const currentRoleId = row.roleId ?? roleOptions.find((r) => r.code === role)?.id;
        if (canWrite && roleOptions.length > 0) {
          return (
            <Select
              size="small"
              style={{ width: 140 }}
              value={currentRoleId ?? undefined}
              options={roleOptions.map((r) => ({ value: r.id, label: `${r.name}（${r.code}）` }))}
              disabled={row.id === identity?.id}
              onChange={(value) => changeRole(row.id, value)}
            />
          );
        }
        return (
          <Tag color={role === "super" ? "gold" : "geekblue"}>{row.roleName ?? role}</Tag>
        );
      },
    },
    {
      title: t("admins.colCreatedAt"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value: string) => new Date(value).toLocaleString(dateLocale),
    },
  ];

  return (
    <div>
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

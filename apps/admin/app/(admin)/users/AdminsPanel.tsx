"use client";

import { usePageSize } from "@/components/antd-providers";
import { usePageActions } from "@/components/page-actions";
import { usePermissions } from "@/components/permissions";
import { useLocale } from "@/lib/i18n";
import { PlusOutlined } from "@ant-design/icons";
import { App, Button, Form, Input, Modal, Select, Table, Tag } from "antd";
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
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm();

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (res.ok) {
        message.success("管理员已创建");
        setCreateOpen(false);
        createForm.resetFields();
        fetchAdmins(1, search, pageSize);
      } else {
        message.error(data.error ?? "创建失败");
      }
    } catch {
      message.error("创建失败");
    } finally {
      setCreating(false);
    }
  };

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

  usePageActions(
    canWrite ? (
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
        新增管理员
      </Button>
    ) : null
  );

  return (
    <div>
      <Input.Search
        allowClear
        placeholder={t("admins.searchPlaceholder")}
        style={{ width: 320, marginBottom: 12 }}
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

      <Modal
        title="新增管理员"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="创建"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: "请输入用户名" },
              { pattern: /^[A-Za-z0-9_]{3,32}$/, message: "3-32 位字母/数字/下划线" },
            ]}
          >
            <Input placeholder="登录用户名" autoComplete="off" />
          </Form.Item>
          <Form.Item
            label="初始密码"
            name="password"
            rules={[
              { required: true, message: "请输入初始密码" },
              { min: 6, message: "密码至少 6 位" },
            ]}
          >
            <Input.Password placeholder="至少 6 位" autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="角色" name="roleId" rules={[{ required: true, message: "请选择角色" }]}>
            <Select
              placeholder="选择角色"
              options={roleOptions.map((r) => ({ value: r.id, label: `${r.name}（${r.code}）` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

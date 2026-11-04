"use client";

import { usePageSize } from "@/components/antd-providers";
import { usePermissions } from "@/components/permissions";
import { useLocale } from "@/lib/i18n";
import { KeyOutlined, PlayCircleOutlined, StopOutlined } from "@ant-design/icons";
import { App, Button, Form, Input, Modal, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";

interface User {
  id: string;
  username: string;
  nickname: string | null;
  status: string;
  createdAt: string;
  _count?: {
    studyAttempts: number;
  };
}

interface PaginatedData {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function UsersPanel() {
  const { locale, t } = useLocale();
  const { pageSize } = usePageSize();
  const { can } = usePermissions();
  const { message } = App.useApp();
  const canWrite = can("users:write");
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetForm] = Form.useForm();
  const [resetting, setResetting] = useState(false);

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    const values = await resetForm.validateFields();
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${resetTarget.id}/password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: values.password }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success(t("users.passwordReset"));
        setResetTarget(null);
        resetForm.resetFields();
      } else {
        message.error(data.error ?? t("users.resetFailed"));
      }
    } catch {
      message.error(t("users.resetFailed"));
    } finally {
      setResetting(false);
    }
  };

  const fetchUsers = async (p: number, s: string) => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
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
      key: "studyAttempts",
      render: (_, record) => record._count?.studyAttempts ?? 0,
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
      width: 120,
      align: "right",
      render: (_, record) => (
        <Space size={4}>
          {canWrite && (
            <Button
              variant="text"
              color="primary"
              size="small"
              icon={<KeyOutlined />}
              title={t("users.resetPassword")}
              aria-label={t("users.resetPassword")}
              onClick={() => setResetTarget(record)}
            />
          )}
          {canWrite && (
            <Button
              variant="text"
              color={record.status === "active" ? "danger" : "primary"}
              size="small"
              icon={record.status === "active" ? <StopOutlined /> : <PlayCircleOutlined />}
              loading={togglingId === record.id}
              title={record.status === "active" ? t("users.disable") : t("users.enable")}
              aria-label={record.status === "active" ? t("users.disable") : t("users.enable")}
              onClick={() => toggleUserStatus(record)}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
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
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (n) => t("common.total", { n }),
          onChange: (p) => fetchUsers(p, search),
        }}
      />

      <Modal
        title={`${t("users.resetTitle")}${resetTarget ? ` · ${resetTarget.username}` : ""}`}
        open={!!resetTarget}
        onCancel={() => setResetTarget(null)}
        onOk={handleResetPassword}
        confirmLoading={resetting}
        okText={t("common.reset")}
        cancelText={t("common.cancel")}
        destroyOnHidden
        afterOpenChange={(open) => {
          // destroyOnHidden 下 Form 只在打开后挂载，重置必须放到挂载之后
          if (open) resetForm.resetFields();
        }}
      >
        <Form form={resetForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            label={t("users.newPassword")}
            name="password"
            rules={[
              { required: true, message: t("users.newPasswordRequired") },
              { min: 6, message: t("users.passwordMin") },
            ]}
          >
            <Input.Password placeholder={t("users.passwordPlaceholder")} autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

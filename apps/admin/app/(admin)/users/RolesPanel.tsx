"use client";

import { usePermissions } from "@/components/permissions";
import { PERMISSION_GROUPS, WILDCARD } from "@/lib/permissions";
import { DeleteOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";

interface RoleItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  sortOrder: number;
  adminCount: number;
  permissions: string[];
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}`, ...extra };
}

export default function RolesPanel() {
  const { message, modal } = App.useApp();
  const { can } = usePermissions();
  const canWrite = can("roles:write");

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();

  const selected = useMemo(
    () => roles.find((r) => r.id === selectedId) ?? null,
    [roles, selectedId]
  );
  const isWildcard = draft.includes(WILDCARD);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles", { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setRoles(data.data);
        setSelectedId((prev) => prev ?? data.data[0]?.id ?? null);
      } else {
        message.error(data.error ?? "加载角色失败");
      }
    } catch {
      message.error("加载角色失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected) setDraft(selected.permissions);
  }, [selected]);

  const toggle = (key: string, checked: boolean) => {
    if (isWildcard) return;
    setDraft((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
        if (key.endsWith(":write")) next.add(key.replace(":write", ":read"));
      } else {
        next.delete(key);
        if (key.endsWith(":read")) next.delete(key.replace(":read", ":write"));
      }
      return Array.from(next);
    });
  };

  const groupAllChecked = (keys: string[]) => keys.every((k) => draft.includes(k));

  const toggleGroup = (keys: string[], checked: boolean) => {
    if (isWildcard) return;
    setDraft((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => (checked ? next.add(k) : next.delete(k)));
      return Array.from(next);
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/roles/${selected.id}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ permissions: draft }),
      });
      const data = await res.json();
      if (res.ok) {
        message.success("已保存");
        await load();
      } else {
        message.error(data.error ?? "保存失败");
      }
    } catch {
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (role: RoleItem) => {
    modal.confirm({
      title: `删除角色「${role.name}」？`,
      content: "该操作不可撤销。",
      okButtonProps: { danger: true },
      onOk: async () => {
        const res = await fetch(`/api/admin/roles/${role.id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        const data = await res.json();
        if (res.ok) {
          message.success("已删除");
          if (selectedId === role.id) setSelectedId(null);
          await load();
        } else {
          message.error(data.error ?? "删除失败");
        }
      },
    });
  };

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ...values, permissions: ["dashboard:read"] }),
    });
    const data = await res.json();
    if (res.ok) {
      message.success("已创建");
      setCreateOpen(false);
      createForm.resetFields();
      setSelectedId(data.id ?? null);
      await load();
    } else {
      message.error(data.error ?? "创建失败");
    }
  };

  const columns: ColumnsType<RoleItem> = [
    {
      title: "角色",
      dataIndex: "name",
      key: "name",
      render: (name: string, row) => (
        <Space size={6}>
          <strong>{name}</strong>
          <Tag>{row.code}</Tag>
          {row.isSystem && <Tag color="default">内置</Tag>}
        </Space>
      ),
    },
    {
      title: "管理员",
      dataIndex: "adminCount",
      key: "adminCount",
      width: 90,
      render: (n: number) => n,
    },
    {
      title: "操作",
      key: "actions",
      width: 80,
      render: (_: unknown, row) =>
        canWrite && !row.isSystem ? (
          <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)} />
        ) : null,
    },
  ];

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      <Card
        size="small"
        title="角色列表"
        style={{ width: 520, flex: "0 0 auto" }}
        extra={
          canWrite ? (
            <Button size="small" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              新建角色
            </Button>
          ) : null
        }
      >
        <Table<RoleItem>
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          dataSource={roles}
          pagination={false}
          rowClassName={(row) => (row.id === selectedId ? "ant-table-row-selected" : "")}
          onRow={(row) => ({ onClick: () => setSelectedId(row.id) })}
          locale={{ emptyText: "暂无角色" }}
        />
      </Card>

      <Card
        size="small"
        style={{ flex: "1 1 420px", minWidth: 420 }}
        title={selected ? `权限配置 · ${selected.name}` : "权限配置"}
        extra={
          canWrite && selected ? (
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={isWildcard}
              onClick={handleSave}
            >
              保存
            </Button>
          ) : null
        }
      >
        {!selected ? (
          <Empty description="请选择左侧角色" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {selected.description && (
              <span style={{ opacity: 0.65, fontSize: 12 }}>{selected.description}</span>
            )}
            {isWildcard && (
              <Tag color="gold">该角色拥有全部权限（通配符），不可编辑</Tag>
            )}
            {PERMISSION_GROUPS.map((group) => {
              const keys = group.writable
                ? [`${group.key}:read`, `${group.key}:write`]
                : [`${group.key}:read`];
              const allChecked = groupAllChecked(keys);
              const disabled = !canWrite || isWildcard;
              return (
                <div key={group.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 110, fontWeight: 600, flex: "0 0 auto" }}>{group.label}</div>
                  <Checkbox
                    checked={allChecked}
                    disabled={disabled}
                    onChange={(e) => toggleGroup(keys, e.target.checked)}
                  >
                    全选
                  </Checkbox>
                  <Checkbox
                    checked={draft.includes(`${group.key}:read`)}
                    disabled={disabled}
                    onChange={(e) => toggle(`${group.key}:read`, e.target.checked)}
                  >
                    查看
                  </Checkbox>
                  {group.writable && (
                    <Checkbox
                      checked={draft.includes(`${group.key}:write`)}
                      disabled={disabled}
                      onChange={(e) => toggle(`${group.key}:write`, e.target.checked)}
                    >
                      编辑
                    </Checkbox>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        title="新建角色"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText="创建"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            label="角色编码"
            name="code"
            rules={[
              { required: true, message: "请输入角色编码" },
              { pattern: /^[a-z][a-z0-9_-]{1,31}$/, message: "2-32 位小写字母/数字/下划线" },
            ]}
          >
            <Input placeholder="如 assistant" />
          </Form.Item>
          <Form.Item label="角色名称" name="name" rules={[{ required: true, message: "请输入角色名称" }]}>
            <Input placeholder="如 助教" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

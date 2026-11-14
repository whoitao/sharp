"use client";

import { TABLE_SCROLL_X } from "@/components/table-actions";

import { usePermissions } from "@/components/permissions";
import { useLocale, type MessageKey } from "@/lib/i18n";
import { PERMISSION_GROUPS, WILDCARD, type PermissionResource } from "@/lib/permissions";
import { PlusOutlined, SaveOutlined } from "@ant-design/icons";
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

/** 权限分组的中文 label 只保留在 lib/permissions.ts 作为兜底，UI 一律按 key 走语言包 */
const PERMISSION_LABEL_KEYS: Record<PermissionResource, MessageKey> = {
  dashboard: "permissions.dashboard",
  questions: "permissions.questions",
  "knowledge-points": "permissions.knowledgePoints",
  tags: "permissions.tags",
  textbooks: "permissions.textbooks",
  grades: "permissions.grades",
  articles: "permissions.articles",
  notifications: "permissions.notifications",
  feedback: "permissions.feedback",
  pets: "permissions.pets",
  "study-records": "permissions.studyRecords",
  users: "permissions.users",
  admins: "permissions.admins",
  roles: "permissions.roles",
  settings: "permissions.settings",
};

export default function RolesPanel() {
  const { message } = App.useApp();
  const { t } = useLocale();
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

  // 内置角色按 code 映射语言包；自定义角色回退到数据库里的名称/描述（数据内容不翻译）
  const roleName = (role: RoleItem) => {
    const key = `roles.${role.code}` as MessageKey;
    const translated = t(key);
    return translated === key ? role.name : translated;
  };
  const roleDescription = (role: RoleItem) => {
    if (!role.description) return null;
    const key = `roles.${role.code}Desc` as MessageKey;
    const translated = t(key);
    return translated === key ? role.description : translated;
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles", { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setRoles(data.data);
        setSelectedId((prev) => prev ?? data.data[0]?.id ?? null);
      } else {
        message.error(data.error ?? t("roles.loadFailed"));
      }
    } catch {
      message.error(t("roles.loadFailed"));
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
        message.success(t("common.saved"));
        await load();
      } else {
        message.error(data.error ?? t("common.saveFailed"));
      }
    } catch {
      message.error(t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
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
      message.success(t("common.created"));
      setCreateOpen(false);
      createForm.resetFields();
      setSelectedId(data.id ?? null);
      await load();
    } else {
      message.error(data.error ?? t("common.createFailed"));
    }
  };

  const columns: ColumnsType<RoleItem> = [
    {
      title: t("roles.title"),
      dataIndex: "name",
      key: "name",
      render: (_name: string, row) => (
        <Space size={6}>
          <strong>{roleName(row)}</strong>
          <Tag>{row.code}</Tag>
          {row.isSystem && <Tag color="default">{t("roles.builtin")}</Tag>}
        </Space>
      ),
    },
    {
      title: t("roles.adminCount"),
      dataIndex: "adminCount",
      key: "adminCount",
      width: 90,
      render: (n: number) => n,
    },
  ];

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
      <Card
        size="small"
        title={t("roles.listTitle")}
        style={{ width: 520, flex: "0 0 auto" }}
        extra={
          canWrite ? (
            <Button size="small" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              {t("roles.addRole")}
            </Button>
          ) : null
        }
      >
        <Table<RoleItem>
          rowKey="id"
          size="small"
          loading={loading}
          columns={columns}
          scroll={{ x: TABLE_SCROLL_X }}
          dataSource={roles}
          pagination={false}
          rowClassName={(row) => (row.id === selectedId ? "ant-table-row-selected" : "")}
          onRow={(row) => ({ onClick: () => setSelectedId(row.id) })}
          locale={{ emptyText: t("roles.empty") }}
        />
      </Card>

      <Card
        size="small"
        style={{ flex: "1 1 420px", minWidth: 420 }}
        title={
          selected
            ? t("roles.permissionConfigFor", { name: roleName(selected) })
            : t("roles.permissionConfig")
        }
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
              {t("common.save")}
            </Button>
          ) : null
        }
      >
        {!selected ? (
          <Empty description={t("roles.selectRole")} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {roleDescription(selected) && (
              <span style={{ opacity: 0.65, fontSize: 12 }}>{roleDescription(selected)}</span>
            )}
            {isWildcard && <Tag color="gold">{t("roles.wildcardHint")}</Tag>}
            {PERMISSION_GROUPS.map((group) => {
              const keys = group.writable
                ? [`${group.key}:read`, `${group.key}:write`]
                : [`${group.key}:read`];
              const allChecked = groupAllChecked(keys);
              const disabled = !canWrite || isWildcard;
              return (
                <div key={group.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 110, fontWeight: 600, flex: "0 0 auto" }}>
                    {t(PERMISSION_LABEL_KEYS[group.key])}
                  </div>
                  <Checkbox
                    checked={allChecked}
                    disabled={disabled}
                    onChange={(e) => toggleGroup(keys, e.target.checked)}
                  >
                    {t("roles.selectAll")}
                  </Checkbox>
                  <Checkbox
                    checked={draft.includes(`${group.key}:read`)}
                    disabled={disabled}
                    onChange={(e) => toggle(`${group.key}:read`, e.target.checked)}
                  >
                    {t("roles.view")}
                  </Checkbox>
                  {group.writable && (
                    <Checkbox
                      checked={draft.includes(`${group.key}:write`)}
                      disabled={disabled}
                      onChange={(e) => toggle(`${group.key}:write`, e.target.checked)}
                    >
                      {t("roles.write")}
                    </Checkbox>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        title={t("roles.createTitle")}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        okText={t("common.create")}
        cancelText={t("common.cancel")}
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            label={t("roles.code")}
            name="code"
            rules={[
              { required: true, message: t("roles.codeRequired") },
              { pattern: /^[a-z][a-z0-9_-]{1,31}$/, message: t("roles.codePattern") },
            ]}
          >
            <Input placeholder={t("roles.codePlaceholder")} />
          </Form.Item>
          <Form.Item
            label={t("roles.name")}
            name="name"
            rules={[{ required: true, message: t("roles.nameRequired") }]}
          >
            <Input placeholder={t("roles.namePlaceholder")} />
          </Form.Item>
          <Form.Item label={t("roles.description")} name="description">
            <Input.TextArea rows={2} placeholder={t("roles.descriptionPlaceholder")} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

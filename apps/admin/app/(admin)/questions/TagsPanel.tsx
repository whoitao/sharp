"use client";

import { FIXED_ACTIONS_COLUMN, TABLE_SCROLL_X } from "@/components/table-actions";

import { usePageSize } from "@/components/antd-providers";
import { usePermissions } from "@/components/permissions";
import { usePageActions } from "@/components/page-actions";
import { useLocale, type MessageKey } from "@/lib/i18n";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
    App,
    Button,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Table,
    Tag,
    theme,
    type TableProps,
} from "antd";
import { useEffect, useMemo, useState } from "react";

type QuestionTag = {
  id: string;
  name: string;
  type: string;
  sortOrder: number;
  questionCount: number;
};

const TYPES: { value: string; labelKey: MessageKey; color: string }[] = [
  { value: "exam", labelKey: "tags.typeExam", color: "red" },
  { value: "source", labelKey: "tags.typeSource", color: "blue" },
  { value: "difficulty", labelKey: "tags.typeDifficulty", color: "orange" },
];

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}`, ...extra };
}

export default function TagsPanel() {
  const { t } = useLocale();
  const { pageSize } = usePageSize();
  const { token } = theme.useToken();
  const { can } = usePermissions();
  const canWrite = can("tags:write");
  const { message, modal } = App.useApp();
  const [data, setData] = useState<QuestionTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionTag | null>(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/tags", { headers: authHeaders() });
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: QuestionTag) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const v = await form.validateFields();
    const body = JSON.stringify({ name: v.name?.trim(), type: v.type, sortOrder: v.sortOrder ?? 0 });
    try {
      const r = editing
        ? await fetch(`/api/admin/tags?id=${editing.id}`, {
            method: "PATCH",
            body,
            headers: authHeaders({ "Content-Type": "application/json" }),
          })
        : await fetch("/api/admin/tags", {
            method: "POST",
            body,
            headers: authHeaders({ "Content-Type": "application/json" }),
          });
      if (!r.ok) throw new Error(await r.text());
      setModalOpen(false);
      message.success(editing ? t("common.updated") : t("common.created"));
      loadData();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = (row: QuestionTag) => {
    modal.confirm({
      title: t("tags.deleteTitle", { name: row.name }),
      content: t("tags.deleteConfirm"),
      okButtonProps: { danger: true },
      onOk: async () => {
        const r = await fetch(`/api/admin/tags?id=${row.id}`, { method: "DELETE", headers: authHeaders() });
        if (!r.ok) throw new Error(await r.text());
        message.success(t("common.deleted"));
        loadData();
      },
    });
  };

  const columns: TableProps<QuestionTag>["columns"] = [
    { title: t("tags.colId"), dataIndex: "id", width: 80 },
    { title: t("tags.colName"), dataIndex: "name" },
    {
      title: t("tags.colType"),
      dataIndex: "type",
      width: 120,
      render: (v) => {
        const typeInfo = TYPES.find((x) => x.value === v);
        return typeInfo ? <Tag color={typeInfo.color}>{t(typeInfo.labelKey)}</Tag> : v;
      },
    },
    { title: t("tags.colSortOrder"), dataIndex: "sortOrder", width: 80, align: "center" },
    { title: t("tags.colQuestionCount"), dataIndex: "questionCount", width: 90, align: "center" },
    {
      title: t("tags.colActions"),
      width: 90,
      align: "right",
      ...FIXED_ACTIONS_COLUMN,
      render: (_, row) => (
        <Space size={4}>
          <Button
            variant="text"
            color="primary"
            size="small"
            icon={<EditOutlined />}
            title={t("common.edit")}
            aria-label={t("common.edit")}
            onClick={() => openEdit(row)}
          />
          <Button
            variant="text"
            color="danger"
            size="small"
            icon={<DeleteOutlined />}
            title={t("common.delete")}
            aria-label={t("common.delete")}
            onClick={() => handleDelete(row)}
          />
        </Space>
      ),
    },
  ];

  const headerActions = useMemo(
    () =>
      canWrite ? (
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("tags.addTag")}
        </Button>
      ) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite, t]
  );
  usePageActions(headerActions);

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center" }}>
        <div style={{ flex: 1, color: token.colorTextTertiary }}>{t("tags.intro")}</div>
      </div>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={data}
        columns={columns}
        scroll={{ x: TABLE_SCROLL_X }}
        pagination={{ pageSize, showSizeChanger: false, showTotal: (n) => t("common.total", { n }) }}
      />
      <Modal
        title={editing ? t("tags.editTitle") : t("tags.createTitle")}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={t("common.create")}
        cancelText={t("common.cancel")}
        destroyOnHidden
        width={420}
        afterOpenChange={(open) => {
          if (!open) return;
          if (editing) {
            form.setFieldsValue({ name: editing.name, type: editing.type, sortOrder: editing.sortOrder });
          } else {
            form.resetFields();
          }
        }}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label={t("tags.name")}
            rules={[{ required: true, message: t("tags.nameRequired") }]}
          >
            <Input placeholder={t("tags.namePlaceholder")} />
          </Form.Item>
          <Form.Item
            name="type"
            label={t("tags.colType")}
            rules={[{ required: true }]}
            initialValue="source"
          >
            <Select options={TYPES.map((x) => ({ value: x.value, label: t(x.labelKey) }))} />
          </Form.Item>
          <Form.Item name="sortOrder" label={t("tags.sortOrder")}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

"use client";

import { FIXED_ACTIONS_COLUMN, TABLE_SCROLL_X } from "@/components/table-actions";

import { usePageSize } from "@/components/antd-providers";
import { usePageActions } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
    App,
    Button,
    Form,
    Input,
    Modal,
    Space,
    Table,
    type TableProps,
} from "antd";
import { useEffect, useMemo, useState } from "react";

type Publisher = {
  id: string;
  name: string;
  chapterCount: number;
};

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}`, ...extra };
}

export default function PublishersPanel() {
  const { t } = useLocale();
  const { pageSize } = usePageSize();
  const { message, modal } = App.useApp();
  const [data, setData] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Publisher | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/publishers", { headers: authHeaders() });
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: Publisher) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      const body = JSON.stringify({ name: values.name.trim() });
      const r = editing
        ? await fetch(`/api/admin/publishers?id=${editing.id}`, { method: "PATCH", body, headers: authHeaders({ "Content-Type": "application/json" }) })
        : await fetch("/api/admin/publishers", { method: "POST", body, headers: authHeaders({ "Content-Type": "application/json" }) });
      if (!r.ok) throw new Error(await r.text());
      setModalOpen(false);
      message.success(editing ? t("common.updated") : t("common.created"));
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = (row: Publisher) => {
    modal.confirm({
      title: t("publishers.deleteTitle", { name: row.name }),
      content:
        row.chapterCount > 0 ? t("publishers.deleteBlocked", { n: row.chapterCount }) : null,
      okButtonProps: { danger: true },
      onOk: async () => {
        const r = await fetch(`/api/admin/publishers?id=${row.id}`, { method: "DELETE", headers: authHeaders() });
        if (!r.ok) throw new Error(await r.text());
        message.success(t("common.deleted"));
        load();
      },
    });
  };

  const columns: TableProps<Publisher>["columns"] = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: t("publishers.colName"), dataIndex: "name" },
    { title: t("publishers.colChapterCount"), dataIndex: "chapterCount", width: 100, align: "center" },
    {
      title: t("publishers.colActions"),
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
    () => (
      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
        {t("publishers.addPublisher")}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );
  usePageActions(headerActions);

  return (
    <div>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={data}
        columns={columns}
        scroll={{ x: TABLE_SCROLL_X }}
        pagination={{
          pageSize,
          showSizeChanger: false,
          showTotal: (n) => t("common.total", { n }),
        }}
      />
      <Modal
        title={editing ? t("publishers.editTitle") : t("publishers.createTitle")}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={t("common.create")}
        cancelText={t("common.cancel")}
        destroyOnHidden
        afterOpenChange={(open) => {
          if (!open) return;
          if (editing) {
            form.setFieldsValue({ name: editing.name });
          } else {
            form.resetFields();
          }
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t("publishers.name")}
            rules={[{ required: true, message: t("publishers.nameRequired") }]}
          >
            <Input placeholder={t("publishers.namePlaceholder")} maxLength={32} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

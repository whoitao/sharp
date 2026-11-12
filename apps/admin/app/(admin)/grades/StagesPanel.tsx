"use client";

import { usePageSize } from "@/components/antd-providers";
import { usePageActions } from "@/components/page-actions";
import { usePermissions } from "@/components/permissions";
import { useLocale, type MessageKey } from "@/lib/i18n";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import {
    App,
    Button,
    Form,
    Input,
    InputNumber,
    Modal,
    Space,
    Table,
    Tag,
    type TableProps,
} from "antd";
import { useEffect, useMemo, useState } from "react";

type Stage = {
  id: string;
  name: string;
  sortOrder: number;
  gradeCount: number;
  knowledgePointCount: number;
};

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}`, ...extra };
}

const STAGE_COLORS: Record<string, string> = {
  小学: "green",
  初中: "blue",
  高中: "purple",
  大学: "orange",
};

// 内置学段名称按语言渲染；自定义学段名回退到数据库内容
const STAGE_NAME_KEYS: Record<string, MessageKey> = {
  小学: "grades.stagePrimary",
  初中: "grades.stageMiddle",
  高中: "grades.stageHigh",
  大学: "grades.stageUniversity",
};

export default function StagesPanel() {
  const { t } = useLocale();
  const { pageSize } = usePageSize();
  const { message, modal } = App.useApp();
  const { can } = usePermissions();
  const canWrite = can("grades:write");
  const [data, setData] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Stage | null>(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/stages", { headers: authHeaders() });
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: Stage) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const v = await form.validateFields();
    const body = JSON.stringify({ name: v.name?.trim(), sortOrder: v.sortOrder ?? 0 });
    try {
      const r = editing
        ? await fetch(`/api/admin/stages?id=${editing.id}`, {
            method: "PATCH",
            body,
            headers: authHeaders({ "Content-Type": "application/json" }),
          })
        : await fetch("/api/admin/stages", {
            method: "POST",
            body,
            headers: authHeaders({ "Content-Type": "application/json" }),
          });
      if (!r.ok) {
        const err = await r.json().catch(() => null);
        throw new Error(err?.error ?? t("common.saveFailed"));
      }
      setModalOpen(false);
      message.success(editing ? t("common.updated") : t("common.created"));
      loadData();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = (row: Stage) => {
    modal.confirm({
      title: t("stages.deleteTitle", { name: row.name }),
      content:
        row.gradeCount > 0 || row.knowledgePointCount > 0
          ? t("stages.deleteBlocked", { grades: row.gradeCount, points: row.knowledgePointCount })
          : null,
      okButtonProps: { danger: true },
      onOk: async () => {
        const r = await fetch(`/api/admin/stages?id=${row.id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => null);
          throw new Error(err?.error ?? t("common.deleteFailed"));
        }
        message.success(t("common.deleted"));
        loadData();
      },
    });
  };

  const headerActions = useMemo(
    () =>
      canWrite ? (
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t("stages.addStage")}
        </Button>
      ) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canWrite, t],
  );
  usePageActions(headerActions);

  const columns: TableProps<Stage>["columns"] = [
    { title: "ID", dataIndex: "id", width: 80 },
    {
      title: t("stages.colStage"),
      dataIndex: "name",
      render: (v) => (
        <Tag color={STAGE_COLORS[v] ?? "default"}>{STAGE_NAME_KEYS[v] ? t(STAGE_NAME_KEYS[v]) : v}</Tag>
      ),
    },
    { title: t("stages.colSortOrder"), dataIndex: "sortOrder", width: 90, align: "center" },
    { title: t("stages.colGradeCount"), dataIndex: "gradeCount", width: 100, align: "center" },
    {
      title: t("stages.colKnowledgePointCount"),
      dataIndex: "knowledgePointCount",
      width: 110,
      align: "center",
    },
    {
      title: t("common.actions"),
      width: 90,
      align: "right",
      render: (_, row) => (
        canWrite ? (
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
        ) : null
      ),
    },
  ];

  return (
    <div>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ pageSize, showSizeChanger: false, showTotal: (n) => t("common.total", { n }) }}
      />
      <Modal
        title={editing ? t("stages.editTitle") : t("stages.createTitle")}
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
            form.setFieldsValue({ name: editing.name, sortOrder: editing.sortOrder });
          } else {
            form.resetFields();
          }
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label={t("stages.name")}
            rules={[{ required: true, message: t("stages.name") }]}
          >
            <Input placeholder={t("stages.namePlaceholder")} />
          </Form.Item>
          <Form.Item name="sortOrder" label={t("stages.sortOrder")}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

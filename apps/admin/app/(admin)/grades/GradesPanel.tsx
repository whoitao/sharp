"use client";

import { usePageSize } from "@/components/antd-providers";
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
    type TableProps,
} from "antd";
import { useEffect, useMemo, useState } from "react";

type Grade = {
  id: string;
  name: string;
  stage: string;
  sortOrder: number;
  chapterCount: number;
};

// STAGES 是数据库存储值，value 不能翻译；仅 label 按语言渲染
const STAGES = ["小学", "初中", "高中", "大学"];

const STAGE_LABEL_KEYS: Record<string, MessageKey> = {
  小学: "grades.stagePrimary",
  初中: "grades.stageMiddle",
  高中: "grades.stageHigh",
  大学: "grades.stageUniversity",
};

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}`, ...extra };
}

export default function GradesPanel() {
  const { t } = useLocale();
  const { pageSize } = usePageSize();
  const { message, modal } = App.useApp();
  const [data, setData] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStage, setFilterStage] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStage) params.set("stage", filterStage);
      const r = await fetch(`/api/admin/grades?${params}`, { headers: authHeaders() });
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStage]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: Grade) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const v = await form.validateFields();
    const body = JSON.stringify({ name: v.name?.trim(), stage: v.stage, sortOrder: v.sortOrder ?? 0 });
    try {
      const r = editing
        ? await fetch(`/api/admin/grades?id=${editing.id}`, {
            method: "PATCH",
            body,
            headers: authHeaders({ "Content-Type": "application/json" }),
          })
        : await fetch("/api/admin/grades", {
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

  const handleDelete = (row: Grade) => {
    modal.confirm({
      title: t("grades.deleteTitle", { name: row.name }),
      content: row.chapterCount > 0 ? t("grades.deleteBlocked", { n: row.chapterCount }) : null,
      okButtonProps: { danger: true },
      onOk: async () => {
        const r = await fetch(`/api/admin/grades?id=${row.id}`, { method: "DELETE", headers: authHeaders() });
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
    () => (
      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
        {t("grades.addGrade")}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );
  usePageActions(headerActions);

  const columns: TableProps<Grade>["columns"] = [
    { title: "ID", dataIndex: "id", width: 80 },
    {
      title: t("grades.colStage"),
      dataIndex: "stage",
      width: 100,
      render: (v) => (
        <Tag
          color={
            v === "小学" ? "green" : v === "初中" ? "blue" : v === "高中" ? "purple" : "orange"
          }
        >
          {STAGE_LABEL_KEYS[v] ? t(STAGE_LABEL_KEYS[v]) : v}
        </Tag>
      ),
    },
    { title: t("grades.colName"), dataIndex: "name" },
    { title: t("grades.colSortOrder"), dataIndex: "sortOrder", width: 80, align: "center" },
    { title: t("grades.colChapterCount"), dataIndex: "chapterCount", width: 90, align: "center" },
    {
      title: t("common.actions"),
      width: 90,
      align: "right",
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

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <Select
          placeholder={t("grades.allStages")}
          allowClear
          style={{ width: 160 }}
          options={STAGES.map((s) => ({ value: s, label: t(STAGE_LABEL_KEYS[s]) }))}
          onChange={setFilterStage}
        />
      </div>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ pageSize, showSizeChanger: false, showTotal: (n) => t("common.total", { n }) }}
      />
      <Modal
        title={editing ? t("grades.editTitle") : t("grades.createTitle")}
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
            form.setFieldsValue({ name: editing.name, stage: editing.stage, sortOrder: editing.sortOrder });
          } else {
            form.resetFields();
          }
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="stage" label={t("grades.stage")} rules={[{ required: true }]}>
            <Select
              options={STAGES.map((s) => ({ value: s, label: t(STAGE_LABEL_KEYS[s]) }))}
              placeholder={t("grades.stagePlaceholder")}
            />
          </Form.Item>
          <Form.Item name="name" label={t("grades.name")} rules={[{ required: true }]}>
            <Input placeholder={t("grades.namePlaceholder")} />
          </Form.Item>
          <Form.Item name="sortOrder" label={t("grades.sortOrder")}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

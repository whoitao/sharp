"use client";

import { PlusOutlined } from "@ant-design/icons";
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
import { useEffect, useState } from "react";

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

export default function StagesPage() {
  const { message, modal } = App.useApp();
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
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: Stage) => {
    setEditing(row);
    form.setFieldsValue({ name: row.name, sortOrder: row.sortOrder });
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
        throw new Error(err?.error ?? "保存失败");
      }
      setModalOpen(false);
      message.success(editing ? "更新成功" : "创建成功");
      loadData();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = (row: Stage) => {
    modal.confirm({
      title: `确认删除「${row.name}」？`,
      content:
        row.gradeCount > 0 || row.knowledgePointCount > 0
          ? `该学段下有 ${row.gradeCount} 个年级、${row.knowledgePointCount} 个知识点，需先移除关联数据`
          : null,
      okButtonProps: { danger: true },
      onOk: async () => {
        const r = await fetch(`/api/admin/stages?id=${row.id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => null);
          throw new Error(err?.error ?? "删除失败");
        }
        message.success("已删除");
        loadData();
      },
    });
  };

  const columns: TableProps<Stage>["columns"] = [
    { title: "ID", dataIndex: "id", width: 80 },
    {
      title: "学段",
      dataIndex: "name",
      render: (v) => <Tag color={STAGE_COLORS[v] ?? "default"}>{v}</Tag>,
    },
    { title: "排序", dataIndex: "sortOrder", width: 90, align: "center" },
    { title: "年级数", dataIndex: "gradeCount", width: 100, align: "center" },
    { title: "知识点数", dataIndex: "knowledgePointCount", width: 110, align: "center" },
    {
      title: "操作",
      width: 160,
      render: (_, row) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(row)}>编辑</Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(row)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建学段</Button>
      </div>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
      />
      <Modal
        title={editing ? "编辑学段" : "新建学段"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        destroyOnHidden
        width={420}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="学段名称" rules={[{ required: true }]}>
            <Input placeholder="如：小学 / 初中 / 高中 / 大学" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

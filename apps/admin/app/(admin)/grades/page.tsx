"use client";

import { PlusOutlined } from "@ant-design/icons";
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
import { useEffect, useState } from "react";

type Grade = {
  id: string;
  name: string;
  stage: string;
  sortOrder: number;
  chapterCount: number;
};

const STAGES = ["小学", "初中", "高中", "大学"];

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}`, ...extra };
}

export default function GradesPage() {
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
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: Grade) => {
    setEditing(row);
    form.setFieldsValue({ name: row.name, stage: row.stage, sortOrder: row.sortOrder });
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
      message.success(editing ? "更新成功" : "创建成功");
      loadData();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = (row: Grade) => {
    modal.confirm({
      title: `确认删除「${row.name}」？`,
      content: row.chapterCount > 0 ? `该年级下有 ${row.chapterCount} 个章节，需先移除章节` : null,
      okButtonProps: { danger: true },
      onOk: async () => {
        const r = await fetch(`/api/admin/grades?id=${row.id}`, { method: "DELETE", headers: authHeaders() });
        if (!r.ok) {
          const err = await r.json().catch(() => null);
          throw new Error(err?.error ?? "删除失败");
        }
        message.success("已删除");
        loadData();
      },
    });
  };

  const columns: TableProps<Grade>["columns"] = [
    { title: "ID", dataIndex: "id", width: 80 },
    {
      title: "阶段",
      dataIndex: "stage",
      width: 100,
      render: (v) => <Tag color={v === "小学" ? "green" : v === "初中" ? "blue" : v === "高中" ? "purple" : "orange"}>{v}</Tag>,
    },
    { title: "年级", dataIndex: "name" },
    { title: "排序", dataIndex: "sortOrder", width: 80, align: "center" },
    { title: "章节数", dataIndex: "chapterCount", width: 90, align: "center" },
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
        <Select
          placeholder="全部阶段"
          allowClear
          style={{ width: 160 }}
          options={STAGES.map((s) => ({ value: s, label: s }))}
          onChange={setFilterStage}
        />
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建年级</Button>
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
        title={editing ? "编辑年级" : "新建年级"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        destroyOnHidden
        width={420}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="stage" label="所属阶段" rules={[{ required: true }]}>
            <Select options={STAGES.map((s) => ({ value: s, label: s }))} placeholder="选择阶段" />
          </Form.Item>
          <Form.Item name="name" label="年级名称" rules={[{ required: true }]}>
            <Input placeholder="如：初一 / 高一 / 大一" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

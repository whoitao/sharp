"use client";

import { usePageActions } from "@/components/page-actions";
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
import { useEffect, useMemo, useState } from "react";

type QuestionTag = {
  id: string;
  name: string;
  type: string;
  sortOrder: number;
  questionCount: number;
};

const TYPES: { value: string; label: string; color: string }[] = [
  { value: "exam", label: "考试类型", color: "red" },
  { value: "source", label: "题目来源", color: "blue" },
  { value: "difficulty", label: "难度", color: "orange" },
];

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}`, ...extra };
}

export default function TagsPage() {
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
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: QuestionTag) => {
    setEditing(row);
    form.setFieldsValue({ name: row.name, type: row.type, sortOrder: row.sortOrder });
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
      message.success(editing ? "更新成功" : "创建成功");
      loadData();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = (row: QuestionTag) => {
    modal.confirm({
      title: `确认删除标签「${row.name}」？`,
      content: "删除后该标签与题目的关联会一并清除，题目本身不受影响。",
      okButtonProps: { danger: true },
      onOk: async () => {
        const r = await fetch(`/api/admin/tags?id=${row.id}`, { method: "DELETE", headers: authHeaders() });
        if (!r.ok) throw new Error(await r.text());
        message.success("已删除");
        loadData();
      },
    });
  };

  const columns: TableProps<QuestionTag>["columns"] = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "标签", dataIndex: "name" },
    {
      title: "用途",
      dataIndex: "type",
      width: 120,
      render: (v) => {
        const t = TYPES.find((x) => x.value === v);
        return t ? <Tag color={t.color}>{t.label}</Tag> : v;
      },
    },
    { title: "排序", dataIndex: "sortOrder", width: 80, align: "center" },
    { title: "题目数", dataIndex: "questionCount", width: 90, align: "center" },
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

  const headerActions = useMemo(
    () => (
      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
        新建标签
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  usePageActions(headerActions);

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center" }}>
        <div style={{ flex: 1, color: "#888" }}>
          标签用于横向筛选题目：中考真题 / 模拟题 / 课后练习…，可与年级、科目、章节、知识点自由叠加。
        </div>
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
        title={editing ? "编辑标签" : "新建标签"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        destroyOnHidden
        width={420}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="标签名称" rules={[{ required: true }]}>
            <Input placeholder="如：中考真题 / 模拟题 / 课后练习" />
          </Form.Item>
          <Form.Item name="type" label="用途" rules={[{ required: true }]} initialValue="source">
            <Select options={TYPES.map((t) => ({ value: t.value, label: t.label }))} />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

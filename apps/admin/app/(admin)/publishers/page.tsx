"use client";

import { usePageActions } from "@/components/page-actions";
import { PlusOutlined } from "@ant-design/icons";
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

export default function PublishersPage() {
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
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: Publisher) => {
    setEditing(row);
    form.setFieldsValue({ name: row.name });
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
      message.success(editing ? "更新成功" : "创建成功");
      load();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = (row: Publisher) => {
    modal.confirm({
      title: `确认删除「${row.name}」？`,
      content: row.chapterCount > 0 ? `该版本下有 ${row.chapterCount} 个章节，删除会级联清除关联数据` : null,
      okButtonProps: { danger: true },
      onOk: async () => {
        const r = await fetch(`/api/admin/publishers?id=${row.id}`, { method: "DELETE", headers: authHeaders() });
        if (!r.ok) throw new Error(await r.text());
        message.success("已删除");
        load();
      },
    });
  };

  const columns: TableProps<Publisher>["columns"] = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "名称", dataIndex: "name" },
    { title: "章节数", dataIndex: "chapterCount", width: 100, align: "center" },
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
        新建版本
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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
        pagination={{ pageSize: 20, showSizeChanger: false }}
      />
      <Modal
        title={editing ? "编辑教材版本" : "新建教材版本"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: "请输入名称" }]}>
            <Input placeholder="如：人教版 / 苏教版 / 鲁教版" maxLength={32} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

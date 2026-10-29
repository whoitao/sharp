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
    type TableProps,
} from "antd";
import { useEffect, useState } from "react";

type Grade = {
  id: string;
  subjectId: string;
  subjectName: string;
  publisherId: string;
  publisherName: string;
  level: number;
  semester: number;
  name: string;
  sortOrder: number;
  chapterCount: number;
};

type OptionItem = { value: string; label: string };

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}`, ...extra };
}

export default function GradesPage() {
  const { message, modal } = App.useApp();
  const [data, setData] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<OptionItem[]>([]);
  const [publishers, setPublishers] = useState<OptionItem[]>([]);
  const [filterSubject, setFilterSubject] = useState<string | undefined>();
  const [filterPublisher, setFilterPublisher] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [form] = Form.useForm();

  const loadOptions = async () => {
    const [sr, pr] = await Promise.all([
      fetch("/api/admin/subjects", { headers: authHeaders() }).then((r) => r.json()),
      fetch("/api/admin/publishers", { headers: authHeaders() }).then((r) => r.json()),
    ]);
    setSubjects(sr.map((s: any) => ({ value: s.id, label: s.name })));
    setPublishers(pr.map((p: any) => ({ value: p.id, label: p.name })));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSubject) params.set("subjectId", filterSubject);
      if (filterPublisher) params.set("publisherId", filterPublisher);
      const r = await fetch(`/api/admin/grades?${params}`, { headers: authHeaders() });
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSubject, filterPublisher]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: Grade) => {
    setEditing(row);
    form.setFieldsValue({
      subjectId: row.subjectId,
      publisherId: row.publisherId,
      level: row.level,
      semester: row.semester,
      name: row.name,
      sortOrder: row.sortOrder,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const v = await form.validateFields();
    const body = JSON.stringify({
      subjectId: v.subjectId,
      publisherId: v.publisherId,
      level: v.level,
      semester: v.semester,
      name: v.name?.trim(),
      sortOrder: v.sortOrder,
    });
    try {
      const r = editing
        ? await fetch(`/api/admin/grades?id=${editing.id}`, { method: "PATCH", body, headers: authHeaders({ "Content-Type": "application/json" }) })
        : await fetch("/api/admin/grades", { method: "POST", body, headers: authHeaders({ "Content-Type": "application/json" }) });
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
      content: row.chapterCount > 0 ? `该年级下有 ${row.chapterCount} 个章节，删除会级联清除` : null,
      okButtonProps: { danger: true },
      onOk: async () => {
        const r = await fetch(`/api/admin/grades?id=${row.id}`, { method: "DELETE", headers: authHeaders() });
        if (!r.ok) throw new Error(await r.text());
        message.success("已删除");
        loadData();
      },
    });
  };

  const columns: TableProps<Grade>["columns"] = [
    { title: "ID", dataIndex: "id", width: 80 },
    { title: "科目", dataIndex: "subjectName", width: 100 },
    { title: "版本", dataIndex: "publisherName", width: 120 },
    { title: "年级", dataIndex: "level", width: 70, align: "center", render: (v) => `${v}年级` },
    { title: "册别", dataIndex: "semester", width: 70, align: "center", render: (v) => (v === 1 ? "上" : v === 2 ? "下" : "全") },
    { title: "名称", dataIndex: "name" },
    { title: "排序", dataIndex: "sortOrder", width: 70, align: "center" },
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
        <Select placeholder="全部科目" allowClear style={{ width: 160 }} options={subjects} onChange={setFilterSubject} />
        <Select placeholder="全部版本" allowClear style={{ width: 160 }} options={publishers} onChange={setFilterPublisher} />
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建年级</Button>
      </div>
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 20, showSizeChanger: false }}
      />
      <Modal
        title={editing ? "编辑年级册别" : "新建年级册别"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        destroyOnHidden
        width={480}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="subjectId" label="科目" rules={[{ required: true }]}>
            <Select options={subjects} placeholder="选择科目" />
          </Form.Item>
          <Form.Item name="publisherId" label="教材版本" rules={[{ required: true }]}>
            <Select options={publishers} placeholder="选择教材版本" />
          </Form.Item>
          <div style={{ display: "flex", gap: 12 }}>
            <Form.Item name="level" label="年级" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={[7, 8, 9].map((v) => ({ value: v, label: `${v}年级` }))} placeholder="年级" />
            </Form.Item>
            <Form.Item name="semester" label="册别" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select options={[{ value: 1, label: "上" }, { value: 2, label: "下" }, { value: 0, label: "全一册" }]} placeholder="册别" />
            </Form.Item>
          </div>
          <Form.Item name="name" label="名称" tooltip="可选，不填则自动生成">
            <Input placeholder="如：人教版-七年级上" />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

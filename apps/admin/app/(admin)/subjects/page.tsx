"use client";

import { usePageActions } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
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
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";

interface SubjectItem {
  id: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  questionCount: number;
  createdAt: string;
}

interface SubjectFormValues {
  name: string;
  icon?: string;
  sortOrder: number;
}

export default function SubjectsPage() {
  const { message } = App.useApp();
  const { t } = useLocale();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [createForm] = Form.useForm<SubjectFormValues>();
  const [editForm] = Form.useForm<SubjectFormValues>();

  const fetchSubjects = async () => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/admin/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch {
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleCreate = async (values: SubjectFormValues) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("subjects.createFailed"));
        return;
      }
      message.success(t("subjects.created"));
      setCreateOpen(false);
      createForm.resetFields();
      fetchSubjects();
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (subject: SubjectItem) => {
    setSelectedSubject(subject);
    editForm.setFieldsValue({
      name: subject.name,
      icon: subject.icon || undefined,
      sortOrder: subject.sortOrder,
    });
    setEditOpen(true);
  };

  const handleUpdate = async (values: SubjectFormValues) => {
    if (!selectedSubject) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/subjects/${selectedSubject.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("subjects.updateFailed"));
        return;
      }
      message.success(t("subjects.updated"));
      setEditOpen(false);
      setSelectedSubject(null);
      fetchSubjects();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSubject) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      await fetch(`/api/admin/subjects/${selectedSubject.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success(t("subjects.deleted"));
      setDeleteOpen(false);
      setSelectedSubject(null);
      fetchSubjects();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<SubjectItem> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      render: (value: string) => (
        <span style={{ fontFamily: "monospace", fontSize: 12 }}>{value}</span>
      ),
    },
    {
      title: t("subjects.iconOptional"),
      dataIndex: "icon",
      key: "icon",
      width: 100,
      render: (icon: string | null) => (icon ? <Tag>{icon}</Tag> : "-"),
    },
    {
      title: t("subjects.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("subjects.sortOrder"),
      dataIndex: "sortOrder",
      key: "sortOrder",
      width: 100,
    },
    {
      title: t("subjects.questionCount"),
      key: "questionCount",
      width: 100,
      render: (_, record) => t("subjects.questionCount", { n: record.questionCount }),
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 100,
      align: "right",
      render: (_, record) => (
        <Space size={0}>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              setSelectedSubject(record);
              setDeleteOpen(true);
            }}
          />
        </Space>
      ),
    },
  ];

  const headerActions = useMemo(
    () => (
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          createForm.resetFields();
          setCreateOpen(true);
        }}
      >
        {t("subjects.addSubject")}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );
  usePageActions(headerActions);

  return (
    <div>
      <Table<SubjectItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={subjects}
        pagination={false}
        locale={{ emptyText: t("subjects.empty") }}
      />

      {/* Create Modal */}
      <Modal
        title={t("subjects.createTitle")}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={saving}
        okText={t("common.create")}
        onOk={() => createForm.submit()}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label={t("subjects.name")}
            name="name"
            rules={[{ required: true, message: t("subjects.nameRequired") }]}
          >
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item label={t("subjects.iconOptional")} name="icon">
            <Input maxLength={20} placeholder="e.g., " />
          </Form.Item>
          <Form.Item label={t("subjects.sortOrder")} name="sortOrder" initialValue={0}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={t("subjects.editTitle")}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setSelectedSubject(null);
        }}
        confirmLoading={saving}
        okText={t("common.saveChanges")}
        onOk={() => editForm.submit()}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item
            label={t("subjects.name")}
            name="name"
            rules={[{ required: true, message: t("subjects.nameRequired") }]}
          >
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item label={t("subjects.iconOptional")} name="icon">
            <Input maxLength={20} placeholder="e.g., 📐" />
          </Form.Item>
          <Form.Item label={t("subjects.sortOrder")} name="sortOrder">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        title={t("subjects.deleteTitle")}
        open={deleteOpen}
        onCancel={() => {
          setDeleteOpen(false);
          setSelectedSubject(null);
        }}
        confirmLoading={saving}
        okText={t("common.delete")}
        okButtonProps={{ danger: true }}
        onOk={handleDelete}
      >
        <p>{t("subjects.deleteConfirm", { name: selectedSubject?.name ?? "" })}</p>
      </Modal>
    </div>
  );
}

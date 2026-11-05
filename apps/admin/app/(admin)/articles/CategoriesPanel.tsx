"use client";

import { FIXED_ACTIONS_COLUMN, TABLE_SCROLL_X } from "@/components/table-actions";

import { usePageActions } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
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
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";

interface CategoryItem {
  id: string;
  name: string;
  sortOrder: number;
  articleCount: number;
}

interface CategoryFormValues {
  name: string;
  sortOrder: number;
}

export default function CategoriesPanel() {
  const { message } = App.useApp();
  const { t } = useLocale();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<CategoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [createForm] = Form.useForm<CategoryFormValues>();
  const [editForm] = Form.useForm<CategoryFormValues>();

  const fetchCategories = async () => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/admin/article-categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (values: CategoryFormValues) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/article-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("articleCategories.createFailed"));
        return;
      }
      message.success(t("articleCategories.created"));
      setCreateOpen(false);
      fetchCategories();
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (category: CategoryItem) => {
    setSelected(category);
    setEditOpen(true);
  };

  const handleUpdate = async (values: CategoryFormValues) => {
    if (!selected) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/article-categories?id=${selected.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("articleCategories.updateFailed"));
        return;
      }
      message.success(t("articleCategories.updated"));
      setEditOpen(false);
      setSelected(null);
      fetchCategories();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/article-categories?id=${selected.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("articleCategories.updateFailed"));
        return;
      }
      message.success(t("articleCategories.deleted"));
      setDeleteOpen(false);
      setSelected(null);
      fetchCategories();
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<CategoryItem> = [
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
      title: t("articleCategories.name"),
      dataIndex: "name",
      key: "name",
    },
    {
      title: t("articleCategories.colArticleCount"),
      key: "articleCount",
      width: 120,
      render: (_, record) => t("articleCategories.articleCount", { n: record.articleCount }),
    },
    {
      title: t("articleCategories.sortOrder"),
      dataIndex: "sortOrder",
      key: "sortOrder",
      width: 100,
    },
    {
      title: t("common.actions"),
      key: "actions",
      width: 90,
      align: "right",
      ...FIXED_ACTIONS_COLUMN,
      render: (_, record) => (
        <Space size={4}>
          <Button
            variant="text"
            color="primary"
            size="small"
            icon={<EditOutlined />}
            title={t("common.edit")}
            aria-label={t("common.edit")}
            onClick={() => openEdit(record)}
          />
          <Button
            variant="text"
            color="danger"
            size="small"
            icon={<DeleteOutlined />}
            title={t("common.delete")}
            aria-label={t("common.delete")}
            onClick={() => {
              setSelected(record);
              setDeleteOpen(true);
            }}
          />
        </Space>
      ),
    },
  ];

  const headerActions = useMemo(
    () => (
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
        {t("articleCategories.addCategory")}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );
  usePageActions(headerActions);

  return (
    <div>
      <Table<CategoryItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        scroll={{ x: TABLE_SCROLL_X }}
        dataSource={categories}
        pagination={false}
        locale={{ emptyText: t("articleCategories.empty") }}
      />

      <Modal
        title={t("articleCategories.createTitle")}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={saving}
        okText={t("common.create")}
        onOk={() => createForm.submit()}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate} preserve={false}>
          <Form.Item
            label={t("articleCategories.name")}
            name="name"
            rules={[{ required: true, message: t("articleCategories.nameRequired") }]}
          >
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item label={t("articleCategories.sortOrder")} name="sortOrder" initialValue={0}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("articleCategories.editTitle")}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setSelected(null);
        }}
        confirmLoading={saving}
        okText={t("common.saveChanges")}
        onOk={() => editForm.submit()}
        destroyOnHidden
        afterOpenChange={(open) => {
          if (open && selected) {
            editForm.setFieldsValue({ name: selected.name, sortOrder: selected.sortOrder });
          }
        }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item
            label={t("articleCategories.name")}
            name="name"
            rules={[{ required: true, message: t("articleCategories.nameRequired") }]}
          >
            <Input maxLength={30} />
          </Form.Item>
          <Form.Item label={t("articleCategories.sortOrder")} name="sortOrder">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("articleCategories.deleteTitle")}
        open={deleteOpen}
        onCancel={() => {
          setDeleteOpen(false);
          setSelected(null);
        }}
        confirmLoading={saving}
        okText={t("common.delete")}
        okButtonProps={{ danger: true }}
        onOk={handleDelete}
      >
        <p>{t("articleCategories.deleteConfirm", { name: selected?.name ?? "" })}</p>
      </Modal>
    </div>
  );
}

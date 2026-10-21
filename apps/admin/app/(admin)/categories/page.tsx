"use client";

import { usePageActions } from "@/components/page-actions";
import { useLocale } from "@/lib/i18n";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { TreeDataNode } from "antd";
import {
  App,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Spin,
  Tag,
  Tree,
  TreeSelect,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";

interface CategoryNode {
  id: string;
  name: string;
  parentId: string;
  sortOrder: number;
  icon: string | null;
  children: CategoryNode[];
  _count?: { questions: number };
}

interface CreateFormValues {
  name: string;
  parentId: string;
  sortOrder: number;
  icon?: string;
}

interface EditFormValues {
  name: string;
  sortOrder: number;
  icon?: string;
}

export default function CategoriesPage() {
  const { message } = App.useApp();
  const { t } = useLocale();
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryNode | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [saving, setSaving] = useState(false);
  const [createForm] = Form.useForm<CreateFormValues>();
  const [editForm] = Form.useForm<EditFormValues>();

  const fetchCategories = async () => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/admin/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const treeData: CategoryNode[] = Array.isArray(data) ? data : [];
      setTree(treeData);
      // Auto-expand all
      const allKeys: React.Key[] = [];
      const collectKeys = (nodes: CategoryNode[]) => {
        nodes.forEach((n) => {
          allKeys.push(n.id);
          if (n.children?.length > 0) collectKeys(n.children);
        });
      };
      collectKeys(treeData);
      setExpandedKeys(allKeys);
    } catch {
      setTree([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parentTreeData = useMemo(() => {
    interface ParentNode {
      value: string;
      title: string;
      children?: ParentNode[];
    }
    const mapNode = (node: CategoryNode): ParentNode => ({
      value: node.id,
      title: node.name,
      children: node.children?.length > 0 ? node.children.map(mapNode) : undefined,
    });
    return tree.map(mapNode);
  }, [tree]);

  const treeData = useMemo(() => {
    const mapNode = (node: CategoryNode): TreeDataNode => ({
      key: node.id,
      title: (
        <Space size={8} style={{ width: "100%", justifyContent: "space-between", paddingRight: 8, paddingTop: 6, paddingBottom: 6 }}>
          <Typography.Text strong>{node.name}</Typography.Text>
          <Space size={4}>
            <Tag>{t("categories.questionsTag", { n: node._count?.questions ?? 0 })}</Tag>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => openCreateChild(node)}
            />
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(node)}
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => openDelete(node)}
            />
          </Space>
        </Space>
      ),
      children: node.children?.length > 0 ? node.children.map(mapNode) : undefined,
    });
    return tree.map(mapNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, t]);

  const handleCreate = async (values: CreateFormValues) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: values.name,
          parentId: values.parentId === "0" ? 0 : Number(values.parentId),
          sortOrder: values.sortOrder ?? 0,
          icon: values.icon || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("categories.createFailed"));
        return;
      }
      message.success(t("categories.created"));
      setCreateOpen(false);
      createForm.resetFields();
      fetchCategories();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (values: EditFormValues) => {
    if (!selectedCategory) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/categories/${selectedCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: values.name,
          sortOrder: values.sortOrder ?? 0,
          icon: values.icon || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        message.error(data?.error || t("categories.updateFailed"));
        return;
      }
      message.success(t("categories.updated"));
      setEditOpen(false);
      setSelectedCategory(null);
      fetchCategories();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      await fetch(`/api/admin/categories/${selectedCategory.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success(t("categories.deleted"));
      setDeleteOpen(false);
      setSelectedCategory(null);
      fetchCategories();
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (cat: CategoryNode) => {
    setSelectedCategory(cat);
    editForm.setFieldsValue({
      name: cat.name,
      sortOrder: cat.sortOrder,
      icon: cat.icon || "",
    });
    setEditOpen(true);
  };

  const openCreateChild = (parentCat: CategoryNode) => {
    createForm.setFieldsValue({
      name: "",
      parentId: parentCat.id,
      sortOrder: 0,
      icon: "",
    });
    setCreateOpen(true);
  };

  const openDelete = (cat: CategoryNode) => {
    setSelectedCategory(cat);
    setDeleteOpen(true);
  };

  const headerActions = useMemo(
    () => (
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          createForm.setFieldsValue({ name: "", parentId: "0", sortOrder: 0, icon: "" });
          setCreateOpen(true);
        }}
      >
        {t("categories.addCategory")}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );
  usePageActions(headerActions);

  return (
    <div>
      <Card>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <Spin />
          </div>
        ) : tree.length === 0 ? (
          <Empty description={t("categories.empty")} />
        ) : (
          <Tree
            blockNode
            defaultExpandAll
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys)}
            treeData={treeData}
          />
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        title={t("categories.createTitle")}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={saving}
        okText={t("common.create")}
        onOk={() => createForm.submit()}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item
            label={t("categories.name")}
            name="name"
            rules={[{ required: true, message: t("categories.nameRequired") }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item label={t("categories.parentCategory")} name="parentId" initialValue="0">
            <TreeSelect
              allowClear={false}
              treeData={[
                { value: "0", title: t("categories.topLevel") },
                ...parentTreeData,
              ]}
              placeholder={t("categories.parentPlaceholder")}
            />
          </Form.Item>
          <Form.Item label={t("categories.sortOrder")} name="sortOrder" initialValue={0}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label={t("categories.iconOptional")} name="icon">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        title={t("categories.editTitle")}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setSelectedCategory(null);
        }}
        confirmLoading={saving}
        okText={t("common.saveChanges")}
        onOk={() => editForm.submit()}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate} style={{ marginTop: 16 }}>
          <Form.Item
            label={t("categories.name")}
            name="name"
            rules={[{ required: true, message: t("categories.nameRequired") }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item label={t("categories.sortOrder")} name="sortOrder" initialValue={0}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label={t("categories.iconOptional")} name="icon">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title={t("categories.deleteTitle")}
        open={deleteOpen}
        onCancel={() => {
          setDeleteOpen(false);
          setSelectedCategory(null);
        }}
        confirmLoading={saving}
        okText={t("common.delete")}
        okButtonProps={{ danger: true }}
        onOk={handleDelete}
      >
        <p>{t("categories.deleteConfirm", { name: selectedCategory?.name ?? "" })}</p>
      </Modal>
    </div>
  );
}

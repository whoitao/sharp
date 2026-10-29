"use client";

import IonIcon from "@/components/IonIcon";
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
    Select,
    Space,
    Spin,
    Tag,
    Tree,
    TreeSelect,
    Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";

interface KPNode {
  id: string;
  name: string;
  parentId: string | null;
  subjectId: string | null;
  sortOrder: number;
  questionCount: number;
  children: KPNode[];
}

interface SubjectItem {
  id: string;
  name: string;
  icon?: string | null;
}

interface CreateFormValues {
  name: string;
  parentId: string;
  subjectId: string | undefined;
  sortOrder: number;
}

interface EditFormValues {
  name: string;
  subjectId: string | undefined;
  sortOrder: number;
}

export default function KnowledgePointsPage() {
  const { message } = App.useApp();
  const { t } = useLocale();
  const [tree, setTree] = useState<KPNode[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<KPNode | null>(null);
  // 待写入新建表单的初始值：表单在弹窗打开后才挂载（destroyOnHidden），
  // 先暂存，在 afterOpenChange 中写入，避免 useForm 未连接告警
  const [pendingCreateValues, setPendingCreateValues] = useState<CreateFormValues | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [saving, setSaving] = useState(false);
  const [createForm] = Form.useForm<CreateFormValues>();
  const [editForm] = Form.useForm<EditFormValues>();

  const fetchSubjects = async () => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/admin/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch {
      setSubjects([]);
    }
  };

  const fetchTree = async () => {
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const url = selectedSubjectId
        ? `/api/admin/knowledge-points?subjectId=${selectedSubjectId}`
        : "/api/admin/knowledge-points";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const treeData: KPNode[] = Array.isArray(data) ? data : [];
      setTree(treeData);
      const keys: React.Key[] = [];
      const walk = (nodes: KPNode[]) => {
        nodes.forEach((n) => {
          keys.push(n.id);
          if (n.children?.length) walk(n.children);
        });
      };
      walk(treeData);
      setExpandedKeys(keys);
    } catch {
      setTree([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId]);

  const parentTreeData = useMemo(() => {
    const convert = (nodes: KPNode[]): TreeDataNode[] =>
      nodes.map((n) => ({
        key: n.id,
        value: n.id,
        title: n.name,
        children: n.children?.length ? convert(n.children) : [],
      }));
    return convert(tree);
  }, [tree]);

  const subjectOptions = subjects.map((s) => ({ value: s.id, label: s.name, icon: s.icon }));
  const subjectOptionRender = (opt: any) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <IonIcon name={opt.data?.icon} size={18} color="var(--ant-primary-color)" />
      {opt.label}
    </span>
  );
  const subjectLabelRender = (opt: any) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <IonIcon name={opt.icon} size={16} color="var(--ant-primary-color)" />
      {opt.label}
    </span>
  );

  const handleCreate = async (values: CreateFormValues) => {
    setSaving(true);
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/admin/knowledge-points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: values.name,
          parentId: values.parentId === "0" ? null : values.parentId,
          subjectId: values.subjectId || null,
          sortOrder: values.sortOrder ?? 0,
        }),
      });
      if (!res.ok) {
        message.error(t("knowledgePoints.createFailed"));
        return;
      }
      message.success(t("knowledgePoints.created"));
      setCreateOpen(false);
      fetchTree();
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (node: KPNode) => {
    setSelectedNode(node);
    setEditOpen(true);
  };

  const handleUpdate = async (values: EditFormValues) => {
    if (!selectedNode) return;
    setSaving(true);
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch(`/api/admin/knowledge-points/${selectedNode.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: values.name,
          subjectId: values.subjectId || null,
          sortOrder: values.sortOrder,
        }),
      });
      if (!res.ok) {
        message.error(t("knowledgePoints.updateFailed"));
        return;
      }
      message.success(t("knowledgePoints.updated"));
      setEditOpen(false);
      setSelectedNode(null);
      fetchTree();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedNode) return;
    setSaving(true);
    const token = localStorage.getItem("admin_token");
    try {
      await fetch(`/api/admin/knowledge-points/${selectedNode.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success(t("knowledgePoints.deleted"));
      setDeleteOpen(false);
      setSelectedNode(null);
      fetchTree();
    } finally {
      setSaving(false);
    }
  };

  const openCreateChild = (parent: KPNode) => {
    setPendingCreateValues({
      name: "",
      parentId: parent.id,
      subjectId: parent.subjectId || selectedSubjectId,
      sortOrder: 0,
    });
    setCreateOpen(true);
  };

  const treeData = useMemo(() => {
    const mapNode = (node: KPNode): TreeDataNode => ({
      key: node.id,
      title: (
        <Space
          size={8}
          style={{
            width: "100%",
            justifyContent: "space-between",
            paddingRight: 8,
            paddingTop: 6,
            paddingBottom: 6,
          }}
        >
          <Typography.Text strong>{node.name}</Typography.Text>
          <Space size={4}>
            <Tag color="blue">
              {t("knowledgePoints.questionCount", { n: node.questionCount })}
            </Tag>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                openCreateChild(node);
              }}
            />
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                openEdit(node);
              }}
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode(node);
                setDeleteOpen(true);
              }}
            />
          </Space>
        </Space>
      ),
      children: node.children?.length > 0 ? node.children.map(mapNode) : undefined,
    });
    return tree.map(mapNode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, t]);

  const headerActions = useMemo(
    () => (
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => {
          setPendingCreateValues({
            name: "",
            parentId: "0",
            subjectId: selectedSubjectId,
            sortOrder: 0,
          });
          setCreateOpen(true);
        }}
      >
        {t("knowledgePoints.addKnowledgePoint")}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, selectedSubjectId]
  );
  usePageActions(headerActions);

  return (
    <div>
      <Card size="small" style={{ marginBottom: 10 }}>
        <Space>
          <span>{t("knowledgePoints.selectSubject")}</span>
          <Select
            allowClear
            style={{ width: 200 }}
            placeholder={t("knowledgePoints.allSubjects")}
            value={selectedSubjectId}
            onChange={(v) => setSelectedSubjectId(v)}
            options={subjectOptions}
            optionRender={subjectOptionRender}
            labelRender={subjectLabelRender}
          />
        </Space>
      </Card>

      <Card>
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <Spin />
          </div>
        ) : tree.length === 0 ? (
          <Empty description={t("knowledgePoints.empty")} />
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

      <Modal
        title={t("knowledgePoints.createTitle")}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        confirmLoading={saving}
        okText={t("common.create")}
        onOk={() => createForm.submit()}
        destroyOnHidden
        afterOpenChange={(open) => {
          if (open && pendingCreateValues) {
            createForm.setFieldsValue(pendingCreateValues);
            setPendingCreateValues(null);
          }
        }}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreate}
          // 弹窗销毁时一并丢弃字段值，避免下次打开带上上次输入
          preserve={false}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            label={t("knowledgePoints.name")}
            name="name"
            rules={[{ required: true, message: t("knowledgePoints.nameRequired") }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item label={t("knowledgePoints.parentKnowledgePoint")} name="parentId" initialValue="0">
            <TreeSelect
              allowClear={false}
              treeData={[
                { value: "0", title: t("knowledgePoints.topLevel") },
                ...parentTreeData,
              ]}
              placeholder={t("knowledgePoints.parentPlaceholder")}
            />
          </Form.Item>
          <Form.Item label={t("knowledgePoints.subjectOptional")} name="subjectId">
            <Select
              allowClear
              placeholder={t("knowledgePoints.subjectPlaceholder")}
              options={subjectOptions}
              optionRender={subjectOptionRender}
              labelRender={subjectLabelRender}
            />
          </Form.Item>
          <Form.Item label={t("knowledgePoints.sortOrder")} name="sortOrder" initialValue={0}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("knowledgePoints.editTitle")}
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setSelectedNode(null);
        }}
        confirmLoading={saving}
        okText={t("common.saveChanges")}
        onOk={() => editForm.submit()}
        destroyOnHidden
        afterOpenChange={(open) => {
          if (open && selectedNode) {
            editForm.setFieldsValue({
              name: selectedNode.name,
              subjectId: selectedNode.subjectId || undefined,
              sortOrder: selectedNode.sortOrder,
            });
          }
        }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdate} style={{ marginTop: 16 }}>
          <Form.Item
            label={t("knowledgePoints.name")}
            name="name"
            rules={[{ required: true, message: t("knowledgePoints.nameRequired") }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item label={t("knowledgePoints.subjectOptional")} name="subjectId">
            <Select
              allowClear
              placeholder={t("knowledgePoints.subjectPlaceholder")}
              options={subjectOptions}
              optionRender={subjectOptionRender}
              labelRender={subjectLabelRender}
            />
          </Form.Item>
          <Form.Item label={t("knowledgePoints.sortOrder")} name="sortOrder">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("knowledgePoints.deleteTitle")}
        open={deleteOpen}
        onCancel={() => {
          setDeleteOpen(false);
          setSelectedNode(null);
        }}
        confirmLoading={saving}
        okText={t("common.delete")}
        okButtonProps={{ danger: true }}
        onOk={handleDelete}
      >
        <p>
          {selectedNode
            ? t("knowledgePoints.deleteConfirm", { name: selectedNode.name })
            : ""}
        </p>
      </Modal>
    </div>
  );
}

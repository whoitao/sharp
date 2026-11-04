"use client";

import SubjectSelect from "@/components/SubjectSelect";
import { usePageActions } from "@/components/page-actions";
import { usePermissions } from "@/components/permissions";
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
  stageId: string;
  sortOrder: number;
  questionCount: number;
  children: KPNode[];
}

interface SubjectItem {
  id: string;
  name: string;
  icon?: string | null;
}

interface StageItem {
  id: string;
  name: string;
}

interface CreateFormValues {
  name: string;
  parentId: string;
  subjectId: string | undefined;
  stageId: string;
  sortOrder: number;
}

interface EditFormValues {
  name: string;
  subjectId: string | undefined;
  sortOrder: number;
}

export default function KnowledgePointsPanel() {
  const { can } = usePermissions();
  const { message } = App.useApp();
  const { t } = useLocale();
  const [tree, setTree] = useState<KPNode[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [stages, setStages] = useState<StageItem[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();
  const [selectedStageId, setSelectedStageId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
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

  const fetchStages = async () => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/admin/grades", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const map = new Map<string, StageItem>();
      if (Array.isArray(data)) {
        for (const g of data) {
          if (g?.stageId) map.set(g.stageId, { id: g.stageId, name: g.stage });
        }
      }
      setStages(Array.from(map.values()));
    } catch {
      setStages([]);
    }
  };

  const fetchTree = async () => {
    // 未选择科目时不请求接口，直接展示空列表
    if (!selectedSubjectId) {
      setTree([]);
      setExpandedKeys([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const params = new URLSearchParams();
      params.set("subjectId", selectedSubjectId);
      if (selectedStageId) params.set("stageId", selectedStageId);
      const res = await fetch(`/api/admin/knowledge-points?${params.toString()}`, {
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
    fetchStages();
  }, []);

  useEffect(() => {
    fetchTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId, selectedStageId]);

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

  const stageOptions = stages.map((s) => ({ value: s.id, label: s.name }));

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
          stageId: values.stageId || undefined,
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
      subjectId: parent.subjectId || undefined,
      stageId: parent.stageId || "",
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
            <Tag color="green">
              {t("knowledgePoints.questionCount", { n: node.questionCount })}
            </Tag>
            <Button
              variant="text"
              color="primary"
              size="small"
              icon={<PlusOutlined />}
              title={t("common.create")}
              aria-label={t("common.create")}
              onClick={(e) => {
                e.stopPropagation();
                openCreateChild(node);
              }}
            />
            <Button
              variant="text"
              color="primary"
              size="small"
              icon={<EditOutlined />}
              title={t("common.edit")}
              aria-label={t("common.edit")}
              onClick={(e) => {
                e.stopPropagation();
                openEdit(node);
              }}
            />
            <Button
              variant="text"
              color="danger"
              size="small"
              icon={<DeleteOutlined />}
              title={t("common.delete")}
              aria-label={t("common.delete")}
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
    () =>
      can("knowledge-points:write") ? (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setPendingCreateValues({
              name: "",
              parentId: "0",
              subjectId: selectedSubjectId,
              stageId: selectedStageId ?? "",
              sortOrder: 0,
            });
            setCreateOpen(true);
          }}
        >
          {t("knowledgePoints.addKnowledgePoint")}
        </Button>
      ) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, selectedSubjectId, selectedStageId, can]
  );
  usePageActions(headerActions);

  return (
    <div>
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space wrap>
          <SubjectSelect
            allowClear
            style={{ width: 200 }}
            placeholder={t("knowledgePoints.selectSubject")}
            value={selectedSubjectId}
            subjects={subjects}
            onChange={(v) => setSelectedSubjectId(v)}
          />
          <Select
            allowClear
            style={{ width: 200 }}
            placeholder={t("knowledgePoints.allStages")}
            value={selectedStageId}
            onChange={(v) => setSelectedStageId(v)}
            options={stageOptions}
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
          <Form.Item
            label={t("knowledgePoints.stage")}
            name="stageId"
            rules={[{ required: true, message: t("knowledgePoints.stageRequired") }]}
          >
            <Select
              placeholder={t("knowledgePoints.stagePlaceholder")}
              options={stageOptions}
            />
          </Form.Item>
          <Form.Item label={t("knowledgePoints.subjectOptional")} name="subjectId">
            <SubjectSelect
              allowClear
              subjects={subjects}
              placeholder={t("knowledgePoints.subjectPlaceholder")}
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
            <SubjectSelect
              allowClear
              subjects={subjects}
              placeholder={t("knowledgePoints.subjectPlaceholder")}
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

"use client";

import { PlusOutlined } from "@ant-design/icons";
import {
    App,
    Button,
    Cascader,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Tree,
} from "antd";
import type { DataNode } from "antd/es/tree";
import { useEffect, useMemo, useState } from "react";

type ChapterNode = {
  id: string;
  gradeId: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  children?: ChapterNode[];
};

type Grade = { id: string; subjectId: string; publisherId: string; name: string; subjectName: string; publisherName: string; level: number; semester: number };

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}`, ...extra };
}

export default function ChaptersPage() {
  const { message, modal } = App.useApp();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | undefined>();
  const [tree, setTree] = useState<ChapterNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChapterNode | null>(null);
  const [form] = Form.useForm();

  const loadGrades = async () => {
    const r = await fetch("/api/admin/grades", { headers: authHeaders() });
    if (!r.ok) return;
    const list = (await r.json()) as Grade[];
    setGrades(list);
    // 默认选中第一个年级
    if (!selectedGrade && list.length > 0) setSelectedGrade(list[0].id);
  };

  const loadTree = async (gradeId: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/chapters?gradeId=${gradeId}`, { headers: authHeaders() });
      if (!r.ok) throw new Error(await r.text());
      setTree(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedGrade) loadTree(selectedGrade);
    else setTree([]);
  }, [selectedGrade]);

  const flattenIds = (nodes: ChapterNode[]): string[] => {
    const ids: string[] = [];
    const walk = (ns: ChapterNode[]) => {
      for (const n of ns) {
        ids.push(n.id);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(nodes);
    return ids;
  };

  const treeData = useMemo<DataNode[]>(() => {
    const map = new Map<string, DataNode>();
    for (const c of flattenIds(tree)) map.set(c, { key: c, title: "" });
    const build = (ns: ChapterNode[]): DataNode[] =>
      ns.map((n) => {
        const node: DataNode = { key: n.id, title: `${n.name}（序${n.sortOrder}）` };
        if (n.children?.length) node.children = build(n.children);
        return node;
      });
    return build(tree);
  }, [tree]);

  const openCreate = () => {
    if (!selectedGrade) { message.warning("请先选择年级"); return; }
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ parentId: null, sortOrder: 0 });
    setModalOpen(true);
  };

  const openEdit = (node: ChapterNode) => {
    setEditing(node);
    form.setFieldsValue({ name: node.name, sortOrder: node.sortOrder });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedGrade) return;
    const v = await form.validateFields();
    const body = JSON.stringify({
      gradeId: selectedGrade,
      parentId: v.parentId ?? null,
      name: v.name.trim(),
      sortOrder: v.sortOrder ?? 0,
    });
    try {
      const r = editing
        ? await fetch(`/api/admin/chapters?id=${editing.id}`, { method: "PATCH", body, headers: authHeaders({ "Content-Type": "application/json" }) })
        : await fetch("/api/admin/chapters", { method: "POST", body, headers: authHeaders({ "Content-Type": "application/json" }) });
      if (!r.ok) throw new Error(await r.text());
      setModalOpen(false);
      message.success(editing ? "更新成功" : "创建成功");
      loadTree(selectedGrade);
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = (node: ChapterNode) => {
    const childCount = flattenIds(node.children ?? []).length;
    modal.confirm({
      title: `确认删除「${node.name}」？`,
      content: childCount > 0 ? `将连同 ${childCount} 个子章节一起删除` : null,
      okButtonProps: { danger: true },
      onOk: async () => {
        const r = await fetch(`/api/admin/chapters?id=${node.id}`, { method: "DELETE", headers: authHeaders() });
        if (!r.ok) throw new Error(await r.text());
        message.success("已删除");
        if (selectedGrade) loadTree(selectedGrade);
      },
    });
  };

  // 父节点选项（根节点 = null，其他 = 自身及祖先之外的所有节点）
  const parentOptions = useMemo(() => {
    const excludeIds = new Set<string>();
    if (editing) {
      const collectAncestors = (ns: ChapterNode[], target: string): ChapterNode | null => {
        for (const n of ns) {
          if (n.id === target) return n;
          if (n.children?.length) {
            const r = collectAncestors(n.children, target);
            if (r) return r;
          }
        }
        return null;
      };
      const collectDescendants = (n: ChapterNode) => {
        excludeIds.add(n.id);
        for (const c of n.children ?? []) collectDescendants(c);
      };
      const found = collectAncestors(tree, editing.id);
      if (found) collectDescendants(found);
    }
    const result: { value: string; label: string; children?: any[] }[] = [];
    const buildOptions = (ns: ChapterNode[], depth = 0): any[] =>
      ns
        .filter((n) => !excludeIds.has(n.id))
        .map((n) => ({
          value: n.id,
          label: "　".repeat(depth) + n.name,
          children: n.children?.length ? buildOptions(n.children, depth + 1) : undefined,
        }));
    result.push({ value: "__root__", label: "（根节点）" });
    result.push(...buildOptions(tree));
    return result;
  }, [tree, editing]);

  const gradeOptions = grades.map((g) => ({
    value: g.id,
    label: `${g.subjectName} · ${g.publisherName} · ${g.level}${g.semester === 1 ? "上" : g.semester === 2 ? "下" : ""}（${g.name}）`,
  }));

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <Select
          placeholder="选择年级"
          style={{ width: 420 }}
          value={selectedGrade}
          options={gradeOptions}
          onChange={setSelectedGrade}
          showSearch
          optionFilterProp="label"
        />
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!selectedGrade}>新建章节</Button>
      </div>

      {!selectedGrade ? (
        <div style={{ padding: 48, textAlign: "center", color: "#999" }}>请先在上方选择年级</div>
      ) : (
        <div style={{ background: "#fafafa", borderRadius: 8, padding: 16, minHeight: 200 }}>
          {loading ? (
            <div style={{ color: "#999", textAlign: "center", padding: 24 }}>加载中...</div>
          ) : tree.length === 0 ? (
            <div style={{ color: "#999", textAlign: "center", padding: 24 }}>暂无章节，点击「新建章节」添加</div>
          ) : (
            <Tree
              treeData={treeData}
              blockNode
              titleRender={(node) => {
                const chapter = tree.find((t) => t.id === node.key) ?? null;
                return (
                  <Space>
                    <span>{node.title as React.ReactNode}</span>
                    {chapter && (
                      <>
                        <Button type="link" size="small" onClick={() => openEdit(chapter)}>编辑</Button>
                        <Button type="link" size="small" danger onClick={() => handleDelete(chapter)}>删除</Button>
                      </>
                    )}
                  </Space>
                );
              }}
            />
          )}
        </div>
      )}

      <Modal
        title={editing ? "编辑章节" : "新建章节"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        destroyOnHidden
        width={480}
      >
        <Form form={form} layout="vertical">
          {!editing && (
            <Form.Item name="parentId" label="父章节">
              <Cascader
                options={parentOptions}
                changeOnSelect
                expandTrigger="hover"
                placeholder="留空则为根节点"
                value={form.getFieldValue("parentId") ? [form.getFieldValue("parentId")] : undefined}
                onChange={(v) => form.setFieldValue("parentId", v && v[0] !== "__root__" ? v[0] : null)}
              />
            </Form.Item>
          )}
          <Form.Item name="name" label="章节名称" rules={[{ required: true, message: "请输入章节名称" }]}>
            <Input placeholder="如：第1章 有理数 / 1.1 正数与负数" maxLength={64} />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

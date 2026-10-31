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
    Tag,
    Tree,
} from "antd";
import type { DataNode } from "antd/es/tree";
import { useEffect, useMemo, useState } from "react";

type ChapterNode = {
  id: string;
  gradeId: string;
  subjectId: string;
  publisherId: string;
  parentId: string | null;
  level: number;
  semester: number | null;
  name: string;
  sortOrder: number;
  questionCount: number;
  children?: ChapterNode[];
};

type Option = { value: string; label: string };

const LEVEL_LABEL: Record<number, string> = { 1: "册", 2: "章", 3: "节" };
const SEMESTER_LABEL: Record<number, string> = { 0: "全一册", 1: "上册", 2: "下册" };

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}`, ...extra };
}

export default function ChaptersPage() {
  const { message, modal } = App.useApp();
  const [grades, setGrades] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [publishers, setPublishers] = useState<Option[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | undefined>();
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const [selectedPublisher, setSelectedPublisher] = useState<string | undefined>();
  const [tree, setTree] = useState<ChapterNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChapterNode | null>(null);
  const [form] = Form.useForm();
  const parentId = Form.useWatch("parentId", form);

  const loadOptions = async () => {
    const [gr, sr, pr] = await Promise.all([
      fetch("/api/admin/grades", { headers: authHeaders() }).then((r) => r.json()),
      fetch("/api/admin/subjects", { headers: authHeaders() }).then((r) => r.json()),
      fetch("/api/admin/publishers", { headers: authHeaders() }).then((r) => r.json()),
    ]);
    setGrades(gr.map((g: any) => ({ value: g.id, label: `${g.name}（${g.stage}）` })));
    setSubjects(sr.map((s: any) => ({ value: s.id, label: s.name })));
    setPublishers(pr.map((p: any) => ({ value: p.id, label: p.name })));
  };

  const loadTree = async () => {
    if (!selectedGrade) {
      setTree([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ gradeId: selectedGrade });
      if (selectedSubject) params.set("subjectId", selectedSubject);
      if (selectedPublisher) params.set("publisherId", selectedPublisher);
      const r = await fetch(`/api/admin/chapters?${params}`, { headers: authHeaders() });
      if (!r.ok) throw new Error(await r.text());
      setTree(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrade, selectedSubject, selectedPublisher]);

  const findNode = (nodes: ChapterNode[], id: string): ChapterNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children?.length) {
        const r = findNode(n.children, id);
        if (r) return r;
      }
    }
    return null;
  };

  const countDescendants = (node: ChapterNode): number =>
    (node.children ?? []).reduce((sum, c) => sum + 1 + countDescendants(c), 0);

  const treeData = useMemo<DataNode[]>(() => {
    const build = (ns: ChapterNode[]): DataNode[] =>
      ns.map((n) => {
        const node: DataNode = {
          key: n.id,
          title: `${n.name}${n.level === 1 && n.semester != null ? `（${SEMESTER_LABEL[n.semester] ?? ""}）` : ""} · ${n.questionCount} 题`,
        };
        if (n.children?.length) node.children = build(n.children);
        return node;
      });
    return build(tree);
  }, [tree]);

  const openCreate = () => {
    if (!selectedGrade || !selectedSubject || !selectedPublisher) {
      message.warning("请先选择年级、科目与教材版本");
      return;
    }
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ parentId: null, sortOrder: 0, semester: 1 });
    setModalOpen(true);
  };

  const openEdit = (node: ChapterNode) => {
    setEditing(node);
    form.setFieldsValue({ name: node.name, sortOrder: node.sortOrder, semester: node.semester ?? 1 });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedGrade || !selectedSubject || !selectedPublisher) return;
    const v = await form.validateFields();
    const body = JSON.stringify({
      gradeId: selectedGrade,
      subjectId: selectedSubject,
      publisherId: selectedPublisher,
      parentId: v.parentId || null,
      semester: v.parentId ? null : v.semester,
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
      loadTree();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = (node: ChapterNode) => {
    const childCount = countDescendants(node);
    modal.confirm({
      title: `确认删除「${node.name}」？`,
      content: childCount > 0 ? `将连同 ${childCount} 个子章节一起删除` : null,
      okButtonProps: { danger: true },
      onOk: async () => {
        const r = await fetch(`/api/admin/chapters?id=${node.id}`, { method: "DELETE", headers: authHeaders() });
        if (!r.ok) {
          const err = await r.json().catch(() => null);
          throw new Error(err?.error ?? "删除失败");
        }
        message.success("已删除");
        loadTree();
      },
    });
  };

  // 父节点选项：编辑时排除自身与所有后代，避免自引用死循环
  const parentOptions = useMemo(() => {
    const excludeIds = new Set<string>();
    if (editing) {
      const node = findNode(tree, editing.id);
      if (node) {
        const collect = (n: ChapterNode) => {
          excludeIds.add(n.id);
          for (const c of n.children ?? []) collect(c);
        };
        collect(node);
      }
    }
    const buildOptions = (ns: ChapterNode[], depth = 0): any[] =>
      ns
        .filter((n) => !excludeIds.has(n.id))
        .map((n) => ({
          value: n.id,
          label: "　".repeat(depth) + n.name,
          children: n.children?.length ? buildOptions(n.children, depth + 1) : undefined,
        }));
    return [{ value: "__root__", label: "（根节点：册）" }, ...buildOptions(tree)];
  }, [tree, editing]);

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Select
          placeholder="选择年级"
          style={{ width: 200 }}
          value={selectedGrade}
          options={grades}
          onChange={setSelectedGrade}
          showSearch
          allowClear
          optionFilterProp="label"
        />
        <Select
          placeholder="科目"
          style={{ width: 160 }}
          value={selectedSubject}
          options={subjects}
          onChange={setSelectedSubject}
          showSearch
          allowClear
          optionFilterProp="label"
        />
        <Select
          placeholder="教材版本"
          style={{ width: 180 }}
          value={selectedPublisher}
          options={publishers}
          onChange={setSelectedPublisher}
          showSearch
          allowClear
          optionFilterProp="label"
        />
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建章节</Button>
      </div>

      {!selectedGrade ? (
        <div style={{ padding: 48, textAlign: "center", color: "#999" }}>请先选择年级</div>
      ) : (
        <div style={{ background: "#fafafa", borderRadius: 8, padding: 16, minHeight: 200 }}>
          {loading ? (
            <div style={{ color: "#999", textAlign: "center", padding: 24 }}>加载中...</div>
          ) : tree.length === 0 ? (
            <div style={{ color: "#999", textAlign: "center", padding: 24 }}>
              暂无章节。根节点是「册」（如七年级上册），册下面再建章、节。
            </div>
          ) : (
            <Tree
              treeData={treeData}
              blockNode
              titleRender={(node) => {
                const chapter = findNode(tree, String(node.key));
                return (
                  <Space>
                    {chapter && chapter.level > 0 && (
                      <Tag color={chapter.level === 1 ? "blue" : chapter.level === 2 ? "geekblue" : "default"}>
                        {LEVEL_LABEL[chapter.level] ?? "节点"}
                      </Tag>
                    )}
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
        <Form form={form} layout="vertical" preserve={false}>
          {!editing && (
            <>
              <Form.Item name="parentId" label="父章节">
                <Cascader
                  options={parentOptions}
                  changeOnSelect
                  expandTrigger="hover"
                  placeholder="留空则为「册」根节点"
                  value={parentId ? [parentId === "__root__" ? "__root__" : parentId] : undefined}
                  onChange={(v) => form.setFieldValue("parentId", v && v[0] !== "__root__" ? v[0] : null)}
                />
              </Form.Item>
              {!parentId && (
                <Form.Item name="semester" label="册别" rules={[{ required: true }]}>
                  <Select
                    options={[
                      { value: 1, label: "上册" },
                      { value: 2, label: "下册" },
                      { value: 0, label: "全一册" },
                    ]}
                  />
                </Form.Item>
              )}
            </>
          )}
          <Form.Item name="name" label="章节名称" rules={[{ required: true, message: "请输入章节名称" }]}>
            <Input placeholder="如：七年级上册 / 第1章 有理数 / 1.1 正数与负数" maxLength={64} />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

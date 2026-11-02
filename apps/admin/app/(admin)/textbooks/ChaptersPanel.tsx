"use client";

import { usePageActions } from "@/components/page-actions";
import { PlusOutlined } from "@ant-design/icons";
import { App, Button, Cascader, Form, Input, InputNumber, Modal, Select, Space, Tag, Tree } from "antd";
import type { DataNode } from "antd/es/tree";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ChapterNode = {
  id: string;
  textbookId: string;
  parentId: string | null;
  level: number;
  name: string;
  sortOrder: number;
  questionCount: number;
  children?: ChapterNode[];
};

type TextbookOption = {
  id: string;
  name: string;
  subjectName: string;
  stageName: string;
  gradeName: string;
  publisherName: string;
  semesterLabel: string;
  coverUrl: string | null;
  chapterCount: number;
  questionCount: number;
};

const LEVEL_LABEL: Record<number, string> = { 1: "章", 2: "节" };

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}`, ...extra };
}

export default function ChaptersPanel() {
  const { message, modal } = App.useApp();
  const [textbooks, setTextbooks] = useState<TextbookOption[]>([]);
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | undefined>();
  const [tree, setTree] = useState<ChapterNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChapterNode | null>(null);
  const [form] = Form.useForm();
  const parentId = Form.useWatch("parentId", form);

  const selectedTextbook = textbooks.find((t) => t.id === selectedTextbookId) ?? null;

  const loadTextbooks = async () => {
    const r = await fetch("/api/admin/textbooks", { headers: authHeaders() });
    const data = await r.json();
    setTextbooks(Array.isArray(data) ? data : []);
  };

  const loadTree = async () => {
    if (!selectedTextbookId) {
      setTree([]);
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/chapters?textbookId=${selectedTextbookId}`, {
        headers: authHeaders(),
      });
      if (!r.ok) throw new Error(await r.text());
      setTree(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTextbooks();
  }, []);

  useEffect(() => {
    loadTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTextbookId]);

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

  // 教材按 学段 → 科目 分组，便于快速定位
  const textbookGroups = useMemo(() => {
    const map = new Map<string, { label: string; options: { value: string; label: string }[] }>();
    for (const t of textbooks) {
      const groupKey = `${t.stageName} / ${t.subjectName}`;
      if (!map.has(groupKey)) map.set(groupKey, { label: groupKey, options: [] });
      map.get(groupKey)!.options.push({ value: t.id, label: t.name });
    }
    return Array.from(map.values());
  }, [textbooks]);

  const treeData = useMemo<DataNode[]>(() => {
    const build = (ns: ChapterNode[]): DataNode[] =>
      ns.map((n) => {
        const node: DataNode = {
          key: n.id,
          title: `${n.name} · ${n.questionCount} 题`,
        };
        if (n.children?.length) node.children = build(n.children);
        return node;
      });
    return build(tree);
  }, [tree]);

  const openCreate = () => {
    if (!selectedTextbookId) {
      message.warning("请先选择教材");
      return;
    }
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ parentId: null, sortOrder: 0 });
    setModalOpen(true);
  };

  const headerActions = useMemo(
    () => (
      <Space>
        <Link href="/textbooks">
          <Button>教材管理</Button>
        </Link>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建章节
        </Button>
      </Space>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedTextbookId],
  );
  usePageActions(headerActions);

  const openEdit = (node: ChapterNode) => {
    setEditing(node);
    form.setFieldsValue({ name: node.name, sortOrder: node.sortOrder });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedTextbookId) return;
    const v = await form.validateFields();
    const body = JSON.stringify({
      textbookId: selectedTextbookId,
      parentId: v.parentId || null,
      name: v.name.trim(),
      sortOrder: v.sortOrder ?? 0,
    });
    try {
      const r = editing
        ? await fetch(`/api/admin/chapters?id=${editing.id}`, {
            method: "PATCH",
            body,
            headers: authHeaders({ "Content-Type": "application/json" }),
          })
        : await fetch("/api/admin/chapters", {
            method: "POST",
            body,
            headers: authHeaders({ "Content-Type": "application/json" }),
          });
      if (!r.ok) throw new Error(await r.text());
      setModalOpen(false);
      message.success(editing ? "更新成功" : "创建成功");
      loadTree();
      loadTextbooks();
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
        const r = await fetch(`/api/admin/chapters?id=${node.id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => null);
          throw new Error(err?.error ?? "删除失败");
        }
        message.success("已删除");
        loadTree();
        loadTextbooks();
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
    return [{ value: "__root__", label: "（根节点：章）" }, ...buildOptions(tree)];
  }, [tree, editing]);

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Select
          placeholder="选择教材"
          style={{ width: 360 }}
          value={selectedTextbookId}
          options={textbookGroups}
          onChange={setSelectedTextbookId}
          showSearch
          allowClear
          optionFilterProp="label"
        />
      </div>

      {selectedTextbook && (
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            background: "#fafafa",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
          }}
        >
          {selectedTextbook.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedTextbook.coverUrl}
              alt={selectedTextbook.name}
              style={{ width: 54, height: 72, objectFit: "cover", borderRadius: 4 }}
            />
          ) : (
            <div
              style={{
                width: 54,
                height: 72,
                borderRadius: 4,
                background: "#eee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#bbb",
                fontSize: 12,
              }}
            >
              无封面
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{selectedTextbook.name}</div>
            <div style={{ color: "#999", fontSize: 12, marginTop: 4 }}>
              {selectedTextbook.publisherName} · {selectedTextbook.chapterCount} 章 ·{" "}
              {selectedTextbook.questionCount} 题
            </div>
          </div>
          <Link href="/textbooks" style={{ marginLeft: "auto" }}>
            <Button size="small">编辑教材</Button>
          </Link>
        </div>
      )}

      {!selectedTextbookId ? (
        <div style={{ padding: 48, textAlign: "center", color: "#999" }}>请先选择教材</div>
      ) : (
        <div style={{ background: "#fafafa", borderRadius: 8, padding: 16, minHeight: 200 }}>
          {loading ? (
            <div style={{ color: "#999", textAlign: "center", padding: 24 }}>加载中...</div>
          ) : tree.length === 0 ? (
            <div style={{ color: "#999", textAlign: "center", padding: 24 }}>
              该教材暂无章节。先建「章」，再在章下建「节」。
            </div>
          ) : (
            <Tree
              treeData={treeData}
              blockNode
              titleRender={(node) => {
                const chapter = findNode(tree, String(node.key));
                return (
                  <Space>
                    {chapter && (
                      <Tag color={chapter.level === 1 ? "blue" : "geekblue"}>
                        {LEVEL_LABEL[chapter.level] ?? "节点"}
                      </Tag>
                    )}
                    <span>{node.title as React.ReactNode}</span>
                    {chapter && (
                      <>
                        <Button type="link" size="small" onClick={() => openEdit(chapter)}>
                          编辑
                        </Button>
                        <Button type="link" size="small" danger onClick={() => handleDelete(chapter)}>
                          删除
                        </Button>
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
            <Form.Item name="parentId" label="父章节">
              <Cascader
                options={parentOptions}
                changeOnSelect
                expandTrigger="hover"
                placeholder="留空则为「章」根节点"
                value={parentId ? [parentId === "__root__" ? "__root__" : parentId] : undefined}
                onChange={(v) => form.setFieldValue("parentId", v && v[0] !== "__root__" ? v[0] : null)}
              />
            </Form.Item>
          )}
          <Form.Item name="name" label="章节名称" rules={[{ required: true, message: "请输入章节名称" }]}>
            <Input placeholder="如：第1章 有理数 / 1.1 正数与负数" maxLength={64} />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

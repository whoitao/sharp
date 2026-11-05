"use client";

import { usePageActions } from "@/components/page-actions";
import { useLocale, type MessageKey } from "@/lib/i18n";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { App, Button, Cascader, Form, Input, InputNumber, Modal, Select, Space, Tag, Tree, theme } from "antd";
import type { DataNode } from "antd/es/tree";
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

const LEVEL_KEYS: Record<number, MessageKey> = {
  1: "chapters.levelChapter",
  2: "chapters.levelSection",
};

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem("admin_token") ?? "";
  return { Authorization: `Bearer ${token}`, ...extra };
}

export default function ChaptersPanel() {
  const { t } = useLocale();
  const { message, modal } = App.useApp();
  const { token } = theme.useToken();
  const [textbooks, setTextbooks] = useState<TextbookOption[]>([]);
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | undefined>();
  const [tree, setTree] = useState<ChapterNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChapterNode | null>(null);
  const [form] = Form.useForm();
  const parentId = Form.useWatch("parentId", form);

  const selectedTextbook = textbooks.find((x) => x.id === selectedTextbookId) ?? null;

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
    for (const x of textbooks) {
      const groupKey = `${x.stageName} / ${x.subjectName}`;
      if (!map.has(groupKey)) map.set(groupKey, { label: groupKey, options: [] });
      map.get(groupKey)!.options.push({ value: x.id, label: x.name });
    }
    return Array.from(map.values());
  }, [textbooks]);

  const treeData = useMemo<DataNode[]>(() => {
    const build = (ns: ChapterNode[]): DataNode[] =>
      ns.map((n) => {
        const node: DataNode = {
          key: n.id,
          title: t("chapters.treeTitle", { name: n.name, n: n.questionCount }),
        };
        if (n.children?.length) node.children = build(n.children);
        return node;
      });
    return build(tree);
  }, [tree, t]);

  const openCreate = () => {
    if (!selectedTextbookId) {
      message.warning(t("chapters.selectTextbookFirst"));
      return;
    }
    setEditing(null);
    setModalOpen(true);
  };

  const headerActions = useMemo(
    () => (
      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
        {t("chapters.addChapter")}
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedTextbookId],
  );
  usePageActions(headerActions);

  const openEdit = (node: ChapterNode) => {
    setEditing(node);
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
      message.success(editing ? t("common.updated") : t("common.created"));
      loadTree();
      loadTextbooks();
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const handleDelete = (node: ChapterNode) => {
    const childCount = countDescendants(node);
    modal.confirm({
      title: t("chapters.deleteTitle", { name: node.name }),
      content: childCount > 0 ? t("chapters.deleteChildren", { n: childCount }) : null,
      okButtonProps: { danger: true },
      onOk: async () => {
        const r = await fetch(`/api/admin/chapters?id=${node.id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (!r.ok) {
          const err = await r.json().catch(() => null);
          throw new Error(err?.error ?? t("common.deleteFailed"));
        }
        message.success(t("common.deleted"));
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
    return [{ value: "__root__", label: t("chapters.rootOption") }, ...buildOptions(tree)];
  }, [tree, editing, t]);

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Select
          placeholder={t("chapters.selectTextbook")}
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
            background: token.colorFillAlter,
            borderRadius: 8,
            padding: 12,
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
                background: token.colorFillSecondary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: token.colorTextQuaternary,
                fontSize: 12,
              }}
            >
              {t("chapters.noCover")}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{selectedTextbook.name}</div>
            <div style={{ color: token.colorTextSecondary, fontSize: 12, marginTop: 4 }}>
              {t("chapters.textbookMeta", {
                publisher: selectedTextbook.publisherName,
                chapters: selectedTextbook.chapterCount,
                questions: selectedTextbook.questionCount,
              })}
            </div>
          </div>
        </div>
      )}

      {!selectedTextbookId ? (
        <div style={{ padding: 48, textAlign: "center", color: token.colorTextSecondary }}>
          {t("chapters.selectTextbookFirst")}
        </div>
      ) : (
        <div style={{ background: token.colorFillAlter, borderRadius: 8, padding: 16, minHeight: 200 }}>
          {loading ? (
            <div style={{ color: token.colorTextSecondary, textAlign: "center", padding: 24 }}>
              {t("chapters.loading")}
            </div>
          ) : tree.length === 0 ? (
            <div style={{ color: token.colorTextSecondary, textAlign: "center", padding: 24 }}>
              {t("chapters.empty")}
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
                        {t(LEVEL_KEYS[chapter.level] ?? "chapters.levelNode")}
                      </Tag>
                    )}
                    <span>{node.title as React.ReactNode}</span>
                    {chapter && (
                      <>
                        <Button
                          variant="text"
                          color="primary"
                          size="small"
                          icon={<EditOutlined />}
                          title={t("common.edit")}
                          aria-label={t("common.edit")}
                          onClick={() => openEdit(chapter)}
                        />
                        <Button
                          variant="text"
                          color="danger"
                          size="small"
                          icon={<DeleteOutlined />}
                          title={t("common.delete")}
                          aria-label={t("common.delete")}
                          onClick={() => handleDelete(chapter)}
                        />
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
        title={editing ? t("chapters.editTitle") : t("chapters.createTitle")}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={t("common.create")}
        cancelText={t("common.cancel")}
        destroyOnHidden
        width={480}
        afterOpenChange={(open) => {
          if (!open) return;
          if (editing) {
            form.setFieldsValue({ name: editing.name, sortOrder: editing.sortOrder });
          } else {
            form.resetFields();
            form.setFieldsValue({ parentId: null, sortOrder: 0 });
          }
        }}
      >
        <Form form={form} layout="vertical" preserve={false}>
          {!editing && (
            <Form.Item name="parentId" label={t("chapters.parent")}>
              <Cascader
                options={parentOptions}
                changeOnSelect
                expandTrigger="hover"
                placeholder={t("chapters.parentPlaceholder")}
                value={parentId ? [parentId === "__root__" ? "__root__" : parentId] : undefined}
                onChange={(v) => form.setFieldValue("parentId", v && v[0] !== "__root__" ? v[0] : null)}
              />
            </Form.Item>
          )}
          <Form.Item
            name="name"
            label={t("chapters.name")}
            rules={[{ required: true, message: t("chapters.nameRequired") }]}
          >
            <Input placeholder={t("chapters.namePlaceholder")} maxLength={64} />
          </Form.Item>
          <Form.Item name="sortOrder" label={t("chapters.sortOrder")}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

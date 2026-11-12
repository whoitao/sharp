"use client";

import { usePermissions } from "@/components/permissions";
import { useLocale } from "@/lib/i18n";
import type { WikiPageDetailDto, WikiTreeNodeDto } from "@sharp/shared";
import { PlusOutlined } from "@ant-design/icons";
import { App, Button, Card, Form, Grid, Input, Modal, TreeSelect } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import WikiEditor from "./wiki/WikiEditor";
import WikiTree from "./wiki/WikiTree";

interface WikiFormValues {
  title: string;
  slug: string;
}

interface MoveTreeNode {
  title: string;
  value: string;
  children?: MoveTreeNode[];
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function findNode(nodes: WikiTreeNodeDto[], id: string): WikiTreeNodeDto | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}

function collectExpandableIds(nodes: WikiTreeNodeDto[], acc: string[] = []): string[] {
  for (const node of nodes) {
    if (node.children.length > 0) {
      acc.push(node.id);
      collectExpandableIds(node.children, acc);
    }
  }
  return acc;
}

function collectSubtreeIds(node: WikiTreeNodeDto, acc: string[] = []): string[] {
  acc.push(node.id);
  for (const child of node.children) collectSubtreeIds(child, acc);
  return acc;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("admin_token");
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init?.body) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { ...init, headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data as T;
}

/** Wiki 管理容器：左侧树 + 右侧编辑，负责树操作与请求编排 */
export default function WikiPanel() {
  const { t } = useLocale();
  const { message, modal } = App.useApp();
  const { can } = usePermissions();
  const canWrite = can("articles:write");
  const screens = Grid.useBreakpoint();
  const narrow = !screens.lg;

  const [tree, setTree] = useState<WikiTreeNodeDto[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WikiPageDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveParentId, setMoveParentId] = useState<string>("");
  const [createForm] = Form.useForm<WikiFormValues>();
  const [renameForm] = Form.useForm<WikiFormValues>();

  const fetchTree = useCallback(async (silent = false) => {
    if (!silent) setTreeLoading(true);
    try {
      const data = await request<{ tree: WikiTreeNodeDto[] }>("/api/admin/wiki/pages");
      const nextTree = Array.isArray(data.tree) ? data.tree : [];
      setTree(nextTree);
      setExpandedKeys((prev) =>
        prev.length > 0 ? prev : collectExpandableIds(nextTree),
      );
    } catch {
      setTree([]);
    } finally {
      if (!silent) setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const loadDetail = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setDetailLoading(true);
      try {
        const data = await request<WikiPageDetailDto>(`/api/admin/wiki/pages/${id}`);
        setDetail(data);
        setDirty(false);
      } catch (err) {
        message.error(err instanceof Error ? err.message : t("wiki.saveFailed"));
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [message, t],
  );

  const guardDirty = (action: () => void) => {
    if (!dirty) {
      action();
      return;
    }
    modal.confirm({
      content: t("wiki.unsavedConfirm"),
      onOk: action,
    });
  };

  const selectNode = (id: string) => {
    if (id === selectedId) return;
    guardDirty(() => loadDetail(id));
  };

  const openCreate = (parentId: string | null) => {
    guardDirty(() => {
      setCreateParentId(parentId);
      createForm.resetFields();
      setCreateOpen(true);
    });
  };

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    setSubmitting(true);
    try {
      const created = await request<{ id: string }>("/api/admin/wiki/pages", {
        method: "POST",
        body: JSON.stringify({
          parentId: createParentId,
          title: values.title,
          slug: values.slug,
        }),
      });
      message.success(t("wiki.created"));
      setCreateOpen(false);
      await fetchTree(true);
      if (createParentId) {
        setExpandedKeys((prev) => Array.from(new Set([...prev, createParentId])));
      }
      await loadDetail(created.id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : t("wiki.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const openRename = () => {
    if (!detail) return;
    renameForm.setFieldsValue({ title: detail.title, slug: detail.slug });
    setRenameOpen(true);
  };

  const handleRename = async () => {
    if (!detail) return;
    const values = await renameForm.validateFields();
    setSubmitting(true);
    try {
      const updated = await request<WikiPageDetailDto>(
        `/api/admin/wiki/pages/${detail.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ title: values.title, slug: values.slug }),
        },
      );
      setDetail(updated);
      setDirty(false);
      setRenameOpen(false);
      message.success(t("wiki.updated"));
      await fetchTree(true);
    } catch (err) {
      message.error(err instanceof Error ? err.message : t("wiki.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const moveTreeData = useMemo<MoveTreeNode[]>(() => {
    if (!detail) return [];
    const current = findNode(tree, detail.id);
    const excluded = new Set(current ? collectSubtreeIds(current) : []);
    const convert = (nodes: WikiTreeNodeDto[]): MoveTreeNode[] =>
      nodes
        .filter((node) => !excluded.has(node.id))
        .map((node) => {
          const children = convert(node.children);
          return {
            title: node.title,
            value: node.id,
            children: children.length > 0 ? children : undefined,
          };
        });
    return [{ title: t("wiki.rootOption"), value: "", children: convert(tree) }];
  }, [detail, tree, t]);

  const openMove = () => {
    if (!detail) return;
    setMoveParentId(detail.parentId ?? "");
    setMoveOpen(true);
  };

  const handleMove = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      await request(`/api/admin/wiki/pages/${detail.id}/move`, {
        method: "POST",
        body: JSON.stringify({ parentId: moveParentId || null, beforeId: null }),
      });
      setMoveOpen(false);
      message.success(t("wiki.moved"));
      await fetchTree(true);
      if (moveParentId) {
        setExpandedKeys((prev) => Array.from(new Set([...prev, moveParentId])));
      }
      await loadDetail(detail.id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : t("wiki.moveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const siblings = useMemo(() => {
    if (!detail) return [];
    if (!detail.parentId) return tree;
    return findNode(tree, detail.parentId)?.children ?? [];
  }, [detail, tree]);

  const currentIndex = detail
    ? siblings.findIndex((node) => node.id === detail.id)
    : -1;

  const moveBy = async (beforeId: string | null) => {
    if (!detail) return;
    try {
      await request(`/api/admin/wiki/pages/${detail.id}/move`, {
        method: "POST",
        body: JSON.stringify({ parentId: detail.parentId, beforeId }),
      });
      message.success(t("wiki.moved"));
      await fetchTree(true);
      await loadDetail(detail.id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : t("wiki.moveFailed"));
    }
  };

  const handleDelete = () => {
    if (!detail) return;
    const current = findNode(tree, detail.id);
    const childCount = current ? collectSubtreeIds(current).length - 1 : 0;
    modal.confirm({
      title: t("wiki.deleteTitle"),
      okButtonProps: { danger: true },
      content: (
        <div>
          <p style={{ marginBottom: childCount > 0 ? 8 : 0 }}>
            {t("wiki.deleteConfirm", { title: detail.title })}
          </p>
          {childCount > 0 && (
            <p style={{ margin: 0 }}>{t("wiki.deleteChildrenNote", { n: childCount })}</p>
          )}
        </div>
      ),
      onOk: async () => {
        try {
          await request(
            `/api/admin/wiki/pages/${detail.id}${childCount > 0 ? "?cascade=true" : ""}`,
            { method: "DELETE" },
          );
          message.success(t("wiki.deleted"));
          setSelectedId(null);
          setDetail(null);
          setDirty(false);
          await fetchTree(true);
        } catch (err) {
          message.error(err instanceof Error ? err.message : t("wiki.deleteFailed"));
          throw err;
        }
      },
    });
  };

  const handleSaved = useCallback(
    (updated: WikiPageDetailDto) => {
      setDetail(updated);
      setDirty(false);
      fetchTree(true);
    },
    [fetchTree],
  );

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: narrow ? "minmax(0, 1fr)" : "280px minmax(0, 1fr)",
          gap: 16,
          alignItems: "stretch",
          // 宽屏时撑满 Content 高度：左右两列各自滚动，整页不再滚动
          height: narrow ? undefined : "100%",
          gridTemplateRows: narrow ? undefined : "minmax(0, 1fr)",
          minHeight: 0,
        }}
      >
        <Card
          size="small"
          title={t("wiki.title")}
          extra={
            canWrite && (
              <Button
                size="small"
                type="text"
                icon={<PlusOutlined />}
                onClick={() => openCreate(null)}
              >
                {t("wiki.addRoot")}
              </Button>
            )
          }
          style={
            narrow
              ? undefined
              : { display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }
          }
          styles={{
            body: {
              padding: 8,
              // 宽屏：卡片撑满左列，树区域自己滚动，卡片标题固定
              ...(narrow
                ? { maxHeight: "30vh" }
                : { flex: 1, minHeight: 0 }),
              overflowY: "auto",
            },
          }}
        >
          <WikiTree
            nodes={tree}
            loading={treeLoading}
            selectedId={selectedId}
            expandedKeys={expandedKeys}
            onSelect={selectNode}
            onExpand={setExpandedKeys}
          />
        </Card>

        <div
          style={{
            minWidth: 0,
            minHeight: 0,
            // 宽屏：右侧编辑区独立垂直滚动
            height: narrow ? undefined : "100%",
            overflowY: narrow ? undefined : "auto",
          }}
        >
          <WikiEditor
            detail={detail}
            loading={detailLoading}
            canWrite={canWrite}
            canMoveUp={currentIndex > 0}
            canMoveDown={currentIndex >= 0 && currentIndex < siblings.length - 1}
            onDirtyChange={setDirty}
            onSaved={handleSaved}
            onAddChild={() => detail && openCreate(detail.id)}
            onRename={openRename}
            onMove={openMove}
            onMoveUp={() => currentIndex > 0 && moveBy(siblings[currentIndex - 1].id)}
            onMoveDown={() =>
              currentIndex >= 0 &&
              currentIndex < siblings.length - 1 &&
              moveBy(siblings[currentIndex + 2]?.id ?? null)
            }
            onDelete={handleDelete}
          />
        </div>
      </div>

      <Modal
        title={t("wiki.createTitle")}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={handleCreate}
        confirmLoading={submitting}
        okText={t("common.create")}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical" preserve={false} className="wiki-form">
          <Form.Item
            name="title"
            label={t("wiki.titleLabel")}
            rules={[{ required: true, message: t("wiki.titleRequired") }]}
          >
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item
            name="slug"
            label={t("wiki.slugLabel")}
            tooltip={t("wiki.slugHint")}
            rules={[
              { required: true, message: t("wiki.slugRequired") },
              { pattern: SLUG_PATTERN, message: t("wiki.slugInvalid") },
            ]}
          >
            <Input maxLength={80} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("wiki.renameTitle")}
        open={renameOpen}
        onCancel={() => setRenameOpen(false)}
        onOk={handleRename}
        confirmLoading={submitting}
        okText={t("common.save")}
        destroyOnHidden
      >
        <Form form={renameForm} layout="vertical" preserve={false} className="wiki-form">
          <Form.Item
            name="title"
            label={t("wiki.titleLabel")}
            rules={[{ required: true, message: t("wiki.titleRequired") }]}
          >
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item
            name="slug"
            label={t("wiki.slugLabel")}
            tooltip={t("wiki.slugHint")}
            rules={[
              { required: true, message: t("wiki.slugRequired") },
              { pattern: SLUG_PATTERN, message: t("wiki.slugInvalid") },
            ]}
          >
            <Input maxLength={80} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t("wiki.moveTitle")}
        open={moveOpen}
        onCancel={() => setMoveOpen(false)}
        onOk={handleMove}
        confirmLoading={submitting}
        okText={t("common.save")}
        destroyOnHidden
      >
        <div style={{ marginBottom: 8 }}>{t("wiki.moveParentLabel")}</div>
        <TreeSelect
          style={{ width: "100%" }}
          value={moveParentId}
          treeDefaultExpandAll
          treeData={moveTreeData}
          onChange={(value) => setMoveParentId(value ?? "")}
        />
      </Modal>
    </>
  );
}

"use client";

import { useLocale } from "@/lib/i18n";
import type { WikiTreeNodeDto } from "@sharp/shared";
import { Empty, Spin, Tag, Tree, theme } from "antd";
import type { DataNode } from "antd/es/tree";
import { useMemo } from "react";

interface WikiTreeProps {
  nodes: WikiTreeNodeDto[];
  loading: boolean;
  selectedId: string | null;
  expandedKeys: string[];
  onSelect: (id: string) => void;
  onExpand: (keys: string[]) => void;
}

/** 左侧 Wiki 树：标题 + 草稿/私有标记，选中节点高亮 */
export default function WikiTree({
  nodes,
  loading,
  selectedId,
  expandedKeys,
  onSelect,
  onExpand,
}: WikiTreeProps) {
  const { t } = useLocale();
  const { token } = theme.useToken();

  const treeData = useMemo<DataNode[]>(() => {
    const convert = (list: WikiTreeNodeDto[]): DataNode[] =>
      list.map((node) => ({
        key: node.id,
        title: (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            <span
              title={node.title}
              style={{
                flex: "0 1 auto",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {node.title}
            </span>
            {node.status === "draft" && (
              <Tag
                variant="filled"
                style={{ marginInlineEnd: 0, color: token.colorTextTertiary }}
              >
                {t("wiki.statusDraft")}
              </Tag>
            )}
            {node.visibility === "private" && (
              <Tag variant="filled" color="orange" style={{ marginInlineEnd: 0 }}>
                {t("wiki.visibilityPrivate")}
              </Tag>
            )}
          </span>
        ),
        children: convert(node.children),
      }));

    return convert(nodes);
  }, [nodes, t, token.colorTextTertiary]);

  if (loading) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={t("wiki.empty")}
        style={{ padding: "24px 0" }}
      />
    );
  }

  return (
    <Tree
      blockNode
      showLine
      treeData={treeData}
      selectedKeys={selectedId ? [selectedId] : []}
      expandedKeys={expandedKeys}
      onExpand={(keys) => onExpand(keys.map(String))}
      onSelect={(keys) => {
        const key = keys[0];
        if (key != null) onSelect(String(key));
      }}
    />
  );
}

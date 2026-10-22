import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ThemeColors } from '../theme/colors';

export interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

interface TreePickerModalProps<T extends TreeNode> {
  visible: boolean;
  title: string;
  roots: T[];
  selectedId: string | null;
  colors: ThemeColors;
  emptyText: string;
  onClose: () => void;
  onSelect: (node: T) => void;
  /** 节点未携带 children 时，展开该节点按需加载子节点 */
  loadChildren?: (node: T) => Promise<T[]>;
}

function TreePickerModal<T extends TreeNode>({
  visible,
  title,
  roots,
  selectedId,
  colors,
  emptyText,
  onClose,
  onSelect,
  loadChildren,
}: TreePickerModalProps<T>) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [lazyChildren, setLazyChildren] = useState<Record<string, T[]>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) {
      setExpandedIds(new Set());
      setLazyChildren({});
      setLoadingIds(new Set());
    }
  }, [visible]);

  const toggleNode = async (node: T) => {
    const loadedChildren = lazyChildren[node.id] ?? node.children;
    if (loadedChildren === undefined && loadChildren) {
      setLoadingIds((prev) => new Set(prev).add(node.id));
      try {
        const children = await loadChildren(node);
        setLazyChildren((prev) => ({ ...prev, [node.id]: children }));
        setExpandedIds((prev) => new Set(prev).add(node.id));
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(node.id);
          return next;
        });
      }
      return;
    }
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) {
        next.delete(node.id);
      } else {
        next.add(node.id);
      }
      return next;
    });
  };

  const renderNodes = (nodes: T[], depth: number, ancestors: Set<string>): React.ReactNode[] =>
    nodes.flatMap((node) => {
      // 防止后端数据存在循环引用时无限递归
      if (ancestors.has(node.id)) {
        return [];
      }
      const childAncestors = new Set(ancestors).add(node.id);
      const children = lazyChildren[node.id] ?? node.children ?? [];
      const canLoad = node.children === undefined && !!loadChildren;
      // 已通过懒加载确认无下级节点时，视为叶子节点，不显示展开标识
      const lazyLoadedEmpty =
        lazyChildren[node.id] !== undefined && lazyChildren[node.id].length === 0;
      const hasChildren = children.length > 0 || (canLoad && !lazyLoadedEmpty);
      const expanded = expandedIds.has(node.id);
      const loading = loadingIds.has(node.id);
      const selected = selectedId === node.id;

      return [
        <TouchableOpacity
          key={node.id}
          style={[
            styles.row,
            { paddingLeft: 8 + depth * 20 },
            selected && { backgroundColor: colors.accentLight },
          ]}
          onPress={() => onSelect(node)}
          activeOpacity={0.7}
        >
          {hasChildren ? (
            <TouchableOpacity
              onPress={() => toggleNode(node)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.arrowButton}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.textTertiary} />
              ) : (
                <Ionicons
                  name={expanded ? 'chevron-down' : 'chevron-forward'}
                  size={16}
                  color={colors.textTertiary}
                />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.arrowButton} />
          )}
          <Text style={[styles.rowText, { color: colors.text }]} numberOfLines={1}>
            {node.name}
          </Text>
        </TouchableOpacity>,
        ...(expanded ? renderNodes(children, depth + 1, childAncestors) : []),
      ];
    });

  const content = useMemo(
    () => renderNodes(roots, 0, new Set()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roots, expandedIds, lazyChildren, loadingIds, selectedId, colors]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {roots.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>{emptyText}</Text>
          ) : (
            <ScrollView style={styles.list}>{content}</ScrollView>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: { width: '100%', maxHeight: '70%', borderRadius: 12, paddingVertical: 16 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  list: { maxHeight: 420, paddingHorizontal: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  arrowButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontSize: 16, marginLeft: 4 },
  emptyText: { fontSize: 15, textAlign: 'center', paddingVertical: 24 },
});

export default TreePickerModal;

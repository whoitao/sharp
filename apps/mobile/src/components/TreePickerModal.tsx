import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDensity } from '../hooks/useDensity';
import type { ThemeColors } from '../theme/colors';

export interface TreeNode {
  id: string;
  name: string;
  children?: TreeNode[];
}

interface FlatRow<T extends TreeNode> {
  node: T;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  loading: boolean;
  selected: boolean;
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

interface TreeRowProps {
  row: FlatRow<TreeNode>;
  colors: ThemeColors;
  spacing: number;
  font: number;
  radius: number;
  onSelect: (node: TreeNode) => void;
  onToggle: (node: TreeNode) => void;
}

const TreeRow = memo(function TreeRow({
  row,
  colors,
  spacing,
  font,
  radius,
  onSelect,
  onToggle,
}: TreeRowProps) {
  const { node, depth, hasChildren, expanded, loading, selected } = row;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          paddingVertical: 12 * spacing,
          paddingRight: 12 * spacing,
          borderRadius: 8 * radius,
          paddingLeft: (8 + depth * 20) * spacing,
        },
        selected && { backgroundColor: colors.accentLight },
      ]}
      onPress={() => onSelect(node)}
      activeOpacity={0.7}
    >
      {hasChildren ? (
        <TouchableOpacity
          onPress={() => onToggle(node)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.arrowButton}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.textTertiary} />
          ) : (
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-forward'}
              size={16 * font}
              color={colors.textTertiary}
            />
          )}
        </TouchableOpacity>
      ) : (
        <View style={[styles.arrowButton, { width: 28 * spacing, height: 28 * spacing }]} />
      )}
      <Text
        style={[styles.rowText, { color: colors.text, fontSize: 16 * font, marginLeft: 4 * spacing }]}
        numberOfLines={1}
      >
        {node.name}
      </Text>
    </TouchableOpacity>
  );
});

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
  const { spacing, font, radius } = useDensity();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [lazyChildren, setLazyChildren] = useState<Record<string, T[]>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  // 父组件通常以内联函数传入 onSelect，用 ref 固定行回调，避免父级每次渲染都让列表失效
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!visible) {
      setExpandedIds(new Set());
      setLazyChildren({});
      setLoadingIds(new Set());
    }
  }, [visible]);

  const toggleNode = useCallback(
    async (node: TreeNode) => {
      const target = node as T;
      const loadedChildren = lazyChildren[target.id] ?? target.children;
      if (loadedChildren === undefined && loadChildren) {
        setLoadingIds((prev) => new Set(prev).add(target.id));
        try {
          const children = await loadChildren(target);
          setLazyChildren((prev) => ({ ...prev, [target.id]: children }));
          setExpandedIds((prev) => new Set(prev).add(target.id));
        } finally {
          setLoadingIds((prev) => {
            const next = new Set(prev);
            next.delete(target.id);
            return next;
          });
        }
        return;
      }
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(target.id)) {
          next.delete(target.id);
        } else {
          next.add(target.id);
        }
        return next;
      });
    },
    [lazyChildren, loadChildren]
  );

  const handleSelect = useCallback((node: TreeNode) => onSelectRef.current(node as T), []);

  // 只把展开路径上的节点压平成可见行；未展开的子树不参与渲染，
  // 祖先链用数组 + includes 判断环，仅在真正下钻时复制一次
  const rows = useMemo(() => {
    const out: FlatRow<T>[] = [];
    const walk = (nodes: T[], depth: number, ancestors: string[]) => {
      for (const node of nodes) {
        if (ancestors.includes(node.id)) continue;
        const children = lazyChildren[node.id] ?? node.children ?? [];
        const canLoad = node.children === undefined && !!loadChildren;
        // 已通过懒加载确认无下级节点时，视为叶子节点，不显示展开标识
        const lazyLoadedEmpty =
          lazyChildren[node.id] !== undefined && lazyChildren[node.id].length === 0;
        const expanded = expandedIds.has(node.id);
        out.push({
          node,
          depth,
          hasChildren: children.length > 0 || (canLoad && !lazyLoadedEmpty),
          expanded,
          loading: loadingIds.has(node.id),
          selected: selectedId === node.id,
        });
        if (expanded) walk(children, depth + 1, [...ancestors, node.id]);
      }
    };
    walk(roots, 0, []);
    return out;
  }, [roots, expandedIds, lazyChildren, loadingIds, selectedId, loadChildren]);

  const renderItem = useCallback(
    ({ item }: { item: FlatRow<T> }) => (
      <TreeRow
        row={item as FlatRow<TreeNode>}
        colors={colors}
        spacing={spacing}
        font={font}
        radius={radius}
        onSelect={handleSelect}
        onToggle={toggleNode}
      />
    ),
    [colors, spacing, font, radius, handleSelect, toggleNode]
  );

  const keyExtractor = useCallback((item: FlatRow<T>) => item.node.id, []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={[styles.overlay, { padding: 20 * spacing }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.content,
            { backgroundColor: colors.surface, borderRadius: 12 * radius, paddingVertical: 16 * spacing },
          ]}
        >
          <Text
            style={[styles.title, { color: colors.text, fontSize: 18 * font, marginBottom: 12 * spacing }]}
          >
            {title}
          </Text>
          {rows.length === 0 ? (
            <Text
              style={[
                styles.emptyText,
                { color: colors.textTertiary, fontSize: 15 * font, paddingVertical: 24 * spacing },
              ]}
            >
              {emptyText}
            </Text>
          ) : (
            <FlatList
              data={rows}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              style={[styles.list, { paddingHorizontal: 8 * spacing }]}
              initialNumToRender={16}
              windowSize={9}
            />
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
  list: { flexGrow: 0, maxHeight: 420 },
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

import type { Category, KnowledgePoint, Subject } from '@sharp/shared';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDensity } from '../hooks/useDensity';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../services/api';
import TreePickerModal from './TreePickerModal';

interface StudyFilterBarProps {
  categories: Category[];
  subjects: Subject[];
  knowledgePoints: KnowledgePoint[];
  selectedCategory: Category | null;
  selectedSubject: Subject | null;
  selectedKP: KnowledgePoint | null;
  onSelectCategory: (cat: Category | null) => void;
  onSelectSubject: (sub: Subject | null) => void;
  onSelectKP: (kp: KnowledgePoint | null) => void;
  /** 允许清除单个已选条件（学习记录页用）；学习页要求三项全选，不传 */
  allowClear?: boolean;
  /** 筛选数据加载中的遮罩（学习页初始化时用） */
  loading?: boolean;
}

/**
 * 分类/科目/知识点 三联动筛选条（含三个选择弹窗）。
 * 学习页与学习记录页共用。
 */
const StudyFilterBar: React.FC<StudyFilterBarProps> = ({
  categories,
  subjects,
  knowledgePoints,
  selectedCategory,
  selectedSubject,
  selectedKP,
  onSelectCategory,
  onSelectSubject,
  onSelectKP,
  allowClear = false,
  loading = false,
}) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [kpModalVisible, setKpModalVisible] = useState(false);

  const renderChip = (
    label: string | null,
    placeholder: string,
    onPress: () => void,
    onClear: (() => void) | null,
  ) => (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 10 * spacing, paddingHorizontal: 12 * spacing, borderRadius: 8 * radius }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[styles.chipText, { color: label ? colors.text : colors.textTertiary, fontSize: 13 * font }]}
        numberOfLines={1}
      >
        {label ?? placeholder}
      </Text>
      {allowClear && label && onClear && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: colors.textTertiary, fontSize: 13 * font, marginLeft: 4 * spacing }}>✕</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { padding: 12 * spacing, paddingTop: 0, gap: 8 * spacing }]}>
      {renderChip(
        selectedCategory?.name ?? null,
        t.studySelectCategory,
        () => setCategoryModalVisible(true),
        () => onSelectCategory(null),
      )}
      {renderChip(
        selectedSubject?.name ?? null,
        t.studySelectSubject,
        () => setSubjectModalVisible(true),
        () => onSelectSubject(null),
      )}
      {renderChip(
        selectedKP?.name ?? null,
        t.studySelectKnowledgePoint,
        () => setKpModalVisible(true),
        () => onSelectKP(null),
      )}
      {loading && (
        <View style={[styles.loadingOverlay, { borderRadius: 8 * radius }]}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={{ fontSize: 13 * font, color: colors.textSecondary }}>{t.loading}</Text>
        </View>
      )}

      <TreePickerModal<Category>
        visible={categoryModalVisible}
        title={t.studySelectCategory}
        roots={categories}
        selectedId={selectedCategory?.id ?? null}
        colors={colors}
        emptyText={t.noData}
        onClose={() => setCategoryModalVisible(false)}
        onSelect={(node) => {
          onSelectCategory(node);
          setCategoryModalVisible(false);
        }}
        loadChildren={(node) => api.getCategories(node.id)}
      />

      <Modal visible={subjectModalVisible} transparent animationType="fade" onRequestClose={() => setSubjectModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSubjectModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 * font }]}>{t.studySelectSubject}</Text>
            <ScrollView style={styles.modalList}>
              {subjects.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={[styles.modalOption, { borderRadius: 8 * radius }, selectedSubject?.id === sub.id && { backgroundColor: colors.accentLight }]}
                  onPress={() => {
                    onSelectSubject(sub);
                    setSubjectModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text, fontSize: 16 * font }]}>{sub.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <TreePickerModal<KnowledgePoint>
        visible={kpModalVisible}
        title={t.studySelectKnowledgePoint}
        roots={knowledgePoints}
        selectedId={selectedKP?.id ?? null}
        colors={colors}
        emptyText={t.noData}
        defaultExpandAll
        onClose={() => setKpModalVisible(false)}
        onSelect={(node) => {
          onSelectKP(node);
          setKpModalVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 12, paddingTop: 0, gap: 8, position: 'relative' },
  chip: { flex: 1, flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '500' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '60%', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  modalList: { maxHeight: 300 },
  modalOption: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 4 },
  modalOptionText: { fontSize: 16, textAlign: 'center' },
});

export default StudyFilterBar;

import { Ionicons } from '@expo/vector-icons';
import type { Grade, KnowledgePoint, QuestionTag, Subject } from '@sharp/shared';
import React, { useEffect, useRef, useState } from 'react';
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

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** 后台存的是 Ionicons 名称，历史 / 异常值不渲染图标，只显示文字 */
function isIoniconName(value?: string | null): value is IoniconName {
  return !!value && value in Ionicons.glyphMap;
}

interface StudyFilterBarProps {
  subjects: Subject[];
  selectedSubject: Subject | null;
  selectedKP: KnowledgePoint | null;
  onSelectSubject: (sub: Subject | null) => void;
  onSelectKP: (kp: KnowledgePoint | null) => void;
  /** 年级字典（全局学习范围）；不传则不显示年级筛选 */
  grades?: Grade[];
  selectedGrade?: Grade | null;
  onSelectGrade?: (grade: Grade | null) => void;
  /** 标签 chips（多选，横向过滤） */
  tags?: QuestionTag[];
  selectedTagIds?: string[];
  onToggleTag?: (tagId: string) => void;
  /** 允许清除单个已选条件（学习记录页用）；学习页要求科目与知识点必选，不传 */
  allowClear?: boolean;
  /** 隐藏「年级 + 科目」行（学习页把它们放在原生 header，页面内不再重复展示） */
  hideScope?: boolean;
  /** 筛选数据加载中的遮罩（学习页初始化时用） */
  loading?: boolean;
}

/**
 * 年级/科目/知识点 联动筛选条 + 标签 chips。
 * 学习页与学习记录页共用。
 */
const StudyFilterBar: React.FC<StudyFilterBarProps> = ({
  subjects,
  selectedSubject,
  selectedKP,
  onSelectSubject,
  onSelectKP,
  grades,
  selectedGrade,
  onSelectGrade,
  tags,
  selectedTagIds,
  onToggleTag,
  allowClear = false,
  hideScope = false,
  loading = false,
}) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [kpModalVisible, setKpModalVisible] = useState(false);

  // 知识点按学科过滤：学科未选时不可选，选中学科后按 subjectId 拉取
  const [subjectKPs, setSubjectKPs] = useState<KnowledgePoint[]>([]);
  const onSelectKPRef = useRef(onSelectKP);
  useEffect(() => {
    onSelectKPRef.current = onSelectKP;
  }, [onSelectKP]);

  useEffect(() => {
    let cancelled = false;
    // 学科/学段变化后已选知识点不再有效，需要清空
    onSelectKPRef.current(null);
    if (!selectedSubject) {
      setSubjectKPs([]);
      return;
    }
    (async () => {
      try {
        const tree = await api.getKnowledgePoints(selectedSubject.id, selectedGrade?.stageId);
        if (!cancelled) setSubjectKPs(tree);
      } catch {
        if (!cancelled) setSubjectKPs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSubject, selectedGrade?.stageId]);

  const kpDisabled = !selectedSubject;

  const renderChip = (
    label: React.ReactNode,
    placeholder: string,
    onPress: () => void,
    onClear: (() => void) | null,
    disabled = false,
  ) => (
    <TouchableOpacity
      disabled={disabled}
      style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 10 * spacing, paddingHorizontal: 12 * spacing, borderRadius: 12 * radius }, disabled && styles.chipDisabled]}
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
      {/* 全局学习范围：年级 + 科目（学习页已挪到原生 header，传 hideScope 隐藏） */}
      {!hideScope && (
      <View style={[styles.row, { gap: 8 * spacing }]}>
        {grades && onSelectGrade &&
          renderChip(
            selectedGrade?.name ?? null,
            t.studySelectGrade,
            () => setGradeModalVisible(true),
            () => onSelectGrade(null),
          )}
        {renderChip(
          selectedSubject ? (
            <>
              {isIoniconName(selectedSubject.icon) && (
                <Ionicons
                  name={selectedSubject.icon}
                  size={13 * font}
                  color={colors.accent}
                />
              )}
              {` ${selectedSubject.name}`}
            </>
          ) : null,
          t.studySelectSubject,
          () => setSubjectModalVisible(true),
          () => onSelectSubject(null),
        )}
      </View>
      )}

      {/* 交叉筛选：知识点 */}
      <View style={[styles.row, { gap: 8 * spacing }]}>
        {renderChip(
          selectedKP?.name ?? null,
          t.studySelectKnowledgePoint,
          () => setKpModalVisible(true),
          () => onSelectKP(null),
          kpDisabled,
        )}
      </View>

      {/* 标签 chips：横向多选，与年级/科目/知识点正交 */}
      {!!tags && tags.length > 0 && !!onToggleTag && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 * spacing }}
        >
          {tags.map((tag) => {
            const active = selectedTagIds?.includes(tag.id) ?? false;
            return (
              <TouchableOpacity
                key={tag.id}
                onPress={() => onToggleTag(tag.id)}
                activeOpacity={0.7}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: active ? colors.accent : colors.surface,
                    borderColor: active ? colors.accent : colors.border,
                    borderRadius: 6 * radius,
                    paddingVertical: 6 * spacing,
                    paddingHorizontal: 12 * spacing,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? '#fff' : colors.textSecondary,
                    fontSize: 12 * font,
                    fontWeight: '500',
                  }}
                >
                  {tag.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {loading && (
        <View style={[styles.loadingOverlay, { borderRadius: 8 * radius }]}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={{ fontSize: 13 * font, color: colors.textSecondary }}>{t.loading}</Text>
        </View>
      )}

      <Modal visible={gradeModalVisible} transparent animationType="fade" onRequestClose={() => setGradeModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setGradeModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 * font }]}>{t.studySelectGrade}</Text>
            <ScrollView style={styles.modalList}>
              {(grades ?? []).map((grade) => (
                <TouchableOpacity
                  key={grade.id}
                  style={[styles.modalOption, { borderRadius: 12 * radius }, selectedGrade?.id === grade.id && { backgroundColor: colors.accentLight }]}
                  onPress={() => {
                    onSelectGrade?.(grade);
                    setGradeModalVisible(false);
                  }}
                >
                  <View style={styles.modalOptionRow}>
                    <Text style={[styles.modalOptionText, { color: colors.text, fontSize: 16 * font }]}>{grade.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={subjectModalVisible} transparent animationType="fade" onRequestClose={() => setSubjectModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSubjectModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 * font }]}>{t.studySelectSubject}</Text>
            <ScrollView style={styles.modalList}>
              {subjects.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={[styles.modalOption, { borderRadius: 12 * radius }, selectedSubject?.id === sub.id && { backgroundColor: colors.accentLight }]}
                  onPress={() => {
                    onSelectSubject(sub);
                    setSubjectModalVisible(false);
                  }}
                >
                  <View style={styles.modalOptionRow}>
                    {isIoniconName(sub.icon) && (
                      <Ionicons
                        name={sub.icon}
                        size={20 * font}
                        color={colors.accent}
                        style={{ marginRight: 8 * spacing }}
                      />
                    )}
                    <Text style={[styles.modalOptionText, { color: colors.text, fontSize: 16 * font }]}>{sub.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <TreePickerModal<KnowledgePoint>
        visible={kpModalVisible}
        title={t.studySelectKnowledgePoint}
        roots={subjectKPs}
        selectedId={selectedKP?.id ?? null}
        colors={colors}
        emptyText={t.noData}
        defaultExpandAll
        getTrailing={(node) => `${node.questionCount ?? 0}`}
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
  container: { padding: 12, paddingTop: 0, gap: 8, position: 'relative' },
  row: { flexDirection: 'row' },
  tagChip: { borderWidth: 1 },
  chip: { flex: 1, flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipDisabled: { opacity: 0.45 },
  chipText: { fontSize: 13, fontWeight: '500' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '60%', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  modalList: { maxHeight: 300 },
  modalOption: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 4 },
  modalOptionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  modalOptionText: { fontSize: 16, textAlign: 'center' },
});

export default StudyFilterBar;

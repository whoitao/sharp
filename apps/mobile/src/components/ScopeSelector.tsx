import { Ionicons } from '@expo/vector-icons';
import type { Grade, Subject } from '@sharp/shared';
import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDensity } from '../hooks/useDensity';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../i18n/useTranslation';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** 后端存的是 Ionicons 名称，历史/异常值不渲染图标，仅显示文字 */
function isIoniconName(value?: string | null): value is IoniconName {
  return !!value && value in Ionicons.glyphMap;
}

/** 科目图标优先用后端 Subject.icon 维护的 Ionicons 名称，缺失时回退到通用书签图标 */
const getSubjectIcon = (icon: string | null): IoniconName =>
  isIoniconName(icon) ? icon : 'bookmark-outline';

interface ScopeSelectorProps {
  grades: Grade[];
  subjects: Subject[];
  selectedGrade: Grade | null;
  selectedSubject: Subject | null;
  onChangeGrade: (grade: Grade | null) => void;
  onChangeSubject: (subject: Subject | null) => void;
}

/**
 * 全局「年级 + 科目」学习范围选择器（胶囊按钮）。
 * 首页常驻展示，修改后写入用户设置，学习页/教材页/记录页共用同一套范围。
 */
const ScopeSelector: React.FC<ScopeSelectorProps> = ({
  grades,
  subjects,
  selectedGrade,
  selectedSubject,
  onChangeGrade,
  onChangeSubject,
}) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  // 年级按学段（小学/初中/高中/大学）分组展示
  const gradeGroups = useMemo(() => {
    const map = new Map<string, Grade[]>();
    for (const grade of grades) {
      const list = map.get(grade.stage) ?? [];
      list.push(grade);
      map.set(grade.stage, list);
    }
    return Array.from(map.entries());
  }, [grades]);

  const displayText = (() => {
    if (selectedGrade && selectedSubject) {
      return `${selectedGrade.name} · ${selectedSubject.name}`;
    }
    if (selectedGrade) return selectedGrade.name;
    if (selectedSubject) return selectedSubject.name;
    return t.studySelectScope;
  })();

  const handlePickGrade = (id: string) => {
    onChangeGrade(grades.find((g) => g.id === id) ?? null);
  };

  const handlePickSubject = (id: string) => {
    onChangeSubject(subjects.find((s) => s.id === id) ?? null);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.capsule,
          {
            borderRadius: 12 * radius,
            paddingVertical: 6 * spacing,
          },
        ]}
        activeOpacity={0.6}
        onPress={() => setVisible(true)}
      >
        <Text
          style={{
            color: selectedGrade || selectedSubject ? colors.text : colors.textTertiary,
            fontSize: 13 * font,
            fontWeight: '600',
          }}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={12 * font} color={colors.textTertiary} style={{ marginLeft: 4 * spacing }} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderRadius: 16 * radius, padding: 16 * spacing },
            ]}
          >
            {/* 右上角关闭按钮（点遮罩也可关闭） */}
            <TouchableOpacity
              onPress={() => setVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                position: 'absolute',
                top: 12 * spacing,
                right: 12 * spacing,
                zIndex: 1,
              }}
            >
              <Ionicons name="close" size={20 * font} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* 年级（按学段分组） */}
            <Text style={{ color: colors.textSecondary, fontSize: 13 * font, fontWeight: '600', marginBottom: 8 * spacing }}>
              {t.studySelectGrade}
            </Text>
            <View style={{ marginBottom: 12 * spacing, gap: 8 * spacing }}>
              {gradeGroups.map(([stage, stageGrades]) => (
                <View key={stage} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 13 * font,
                      width: 40 * spacing,
                      // 与首行胶囊垂直居中对齐
                      marginTop: 9 * spacing,
                    }}
                  >
                    {stage}
                  </Text>
                  {/* 换行展示：年级多（如小学六个）时不再横向滚动裁切 */}
                  <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 * spacing }}>
                    {stageGrades.map((grade) => (
                      <TouchableOpacity
                        key={grade.id}
                        style={[
                          styles.optionChip,
                          {
                            backgroundColor: selectedGrade?.id === grade.id ? colors.accentLight : colors.background,
                            borderColor: selectedGrade?.id === grade.id ? colors.accent : colors.border,
                            borderRadius: 12 * radius,
                            paddingHorizontal: 12 * spacing,
                            paddingVertical: 8 * spacing,
                          },
                        ]}
                        onPress={() => handlePickGrade(grade.id)}
                      >
                        <Text
                          style={{
                            color: selectedGrade?.id === grade.id ? colors.accent : colors.text,
                            fontSize: 14 * font,
                            fontWeight: '500',
                          }}
                        >
                          {grade.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* 科目（换行展示 + 图标前缀） */}
            <Text style={{ color: colors.textSecondary, fontSize: 13 * font, fontWeight: '600', marginBottom: 8 * spacing }}>
              {t.studySelectSubject}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 * spacing }}>
              {subjects.map((subject) => {
                const active = selectedSubject?.id === subject.id;
                const tint = active ? colors.accent : colors.textSecondary;
                return (
                  <TouchableOpacity
                    key={subject.id}
                    style={[
                      styles.optionChip,
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4 * spacing,
                        backgroundColor: active ? colors.accentLight : colors.background,
                        borderColor: active ? colors.accent : colors.border,
                        borderRadius: 12 * radius,
                        paddingHorizontal: 12 * spacing,
                        paddingVertical: 8 * spacing,
                      },
                    ]}
                    onPress={() => handlePickSubject(subject.id)}
                  >
                    <Ionicons name={getSubjectIcon(subject.icon)} size={14 * font} color={tint} />
                    <Text
                      style={{
                        color: active ? colors.accent : colors.text,
                        fontSize: 14 * font,
                        fontWeight: '500',
                      }}
                    >
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: { width: '100%' },
  optionChip: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default ScopeSelector;

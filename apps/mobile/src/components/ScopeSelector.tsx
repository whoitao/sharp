import { Ionicons } from '@expo/vector-icons';
import type { Grade, Subject } from '@sharp/shared';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDensity } from '../hooks/useDensity';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../i18n/useTranslation';

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
            <Text style={{ color: colors.text, fontSize: 17 * font, fontWeight: '600', marginBottom: 12 * spacing }}>
              {t.studySelectScope}
            </Text>

            {/* 年级 */}
            <Text style={{ color: colors.textSecondary, fontSize: 13 * font, fontWeight: '600', marginBottom: 8 * spacing }}>
              {t.studySelectGrade}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 * spacing }}>
              <View style={{ flexDirection: 'row', gap: 8 * spacing }}>
                {grades.map((grade) => (
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
            </ScrollView>

            {/* 科目 */}
            <Text style={{ color: colors.textSecondary, fontSize: 13 * font, fontWeight: '600', marginBottom: 8 * spacing }}>
              {t.studySelectSubject}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 * spacing }}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject.id}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: selectedSubject?.id === subject.id ? colors.accentLight : colors.background,
                        borderColor: selectedSubject?.id === subject.id ? colors.accent : colors.border,
                        borderRadius: 12 * radius,
                        paddingHorizontal: 12 * spacing,
                        paddingVertical: 8 * spacing,
                      },
                    ]}
                    onPress={() => handlePickSubject(subject.id)}
                  >
                    <Text
                      style={{
                        color: selectedSubject?.id === subject.id ? colors.accent : colors.text,
                        fontSize: 14 * font,
                        fontWeight: '500',
                      }}
                    >
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
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

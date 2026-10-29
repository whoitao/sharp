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

type PickerMode = 'grade' | 'subject' | null;

/**
 * 全局「年级 + 科目」学习范围选择器。
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
  const [mode, setMode] = useState<PickerMode>(null);

  const options: { id: string; name: string }[] =
    mode === 'grade' ? grades : mode === 'subject' ? subjects : [];
  const currentId = mode === 'grade' ? selectedGrade?.id : selectedSubject?.id;

  const handlePick = (id: string) => {
    if (mode === 'grade') {
      onChangeGrade(grades.find((g) => g.id === id) ?? null);
    } else if (mode === 'subject') {
      onChangeSubject(subjects.find((s) => s.id === id) ?? null);
    }
    setMode(null);
  };

  const chip = (
    value: string | null,
    placeholder: string,
    onPress: () => void,
    icon?: React.ReactNode,
  ) => (
    <TouchableOpacity
      style={[styles.chip, { paddingVertical: 4 * spacing, gap: 2 * spacing }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {icon}
      <Text
        style={{
          color: value ? colors.text : colors.textTertiary,
          fontSize: 13 * font,
          fontWeight: '600',
        }}
        numberOfLines={1}
      >
        {value ?? placeholder}
      </Text>
      <Ionicons name="chevron-down" size={12 * font} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <>
      <View style={[styles.row, { gap: 8 * spacing }]}>
        {chip(selectedGrade?.name ?? null, t.studySelectGrade, () => setMode('grade'))}
        {chip(
          selectedSubject?.name ?? null,
          t.studySelectSubject,
          () => setMode('subject'),
        )}
      </View>

      <Modal visible={mode !== null} transparent animationType="fade" onRequestClose={() => setMode(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMode(null)}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, borderRadius: 16 * radius, padding: 16 * spacing },
            ]}
          >
            <Text style={{ color: colors.text, fontSize: 17 * font, fontWeight: '600', marginBottom: 8 * spacing }}>
              {mode === 'grade' ? t.studySelectGrade : t.studySelectSubject}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {options.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.option,
                    { paddingVertical: 12 * spacing, borderRadius: 8 * radius },
                    currentId === item.id && { backgroundColor: colors.accentLight },
                  ]}
                  onPress={() => handlePick(item.id)}
                >
                  <Text style={{ color: colors.text, fontSize: 15 * font }}>{item.name}</Text>
                  {currentId === item.id && (
                    <Ionicons name="checkmark" size={18 * font} color={colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', maxWidth: '55%' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: { width: '100%' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
});

export default ScopeSelector;

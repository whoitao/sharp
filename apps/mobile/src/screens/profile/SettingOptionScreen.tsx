import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  DENSITY_OPTIONS,
  LANGUAGE_OPTIONS,
  THEME_OPTIONS,
  UNIT_SIZE_OPTIONS,
  type SettingKey,
} from '../../constants/settings';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { StringTranslationKey } from '../../i18n/zh';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import {
  setDensity,
  setGradeId,
  setLanguage,
  setPublisherId,
  setSubjectId,
  setTheme,
  setUnitSize,
  updateSettings
} from '../../stores/settingsSlice';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'SettingOption'>;
type RouteProps = RouteProp<ProfileStackParamList, 'SettingOption'>;

interface SettingOptionScreenProps {
  navigation: NavigationProp;
  route: RouteProps;
}

// 二级页标题取对应设置项名称
const TITLE_KEYS: Record<SettingKey, StringTranslationKey> = {
  density: 'displayDensity',
  unitSize: 'unitSize',
  theme: 'theme',
  language: 'language',
  textbook: 'textbookMy',
};

const SettingOptionScreen: React.FC<SettingOptionScreenProps> = ({ navigation, route }) => {
  const { key } = route.params;
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { unitSize, theme, language, density, publisherId, gradeId, subjectId } = useSelector(
    (state: RootState) => state.settings,
  );

  // 「我的教材」可选项：有教材内容的科目 × 版本 × 年级（同科目+版本+年级去重）
  const [textbookLoading, setTextbookLoading] = useState(false);
  const [textbookOptions, setTextbookOptions] = useState<
    { label: string; publisherId: string; gradeId: string; subjectId: string }[]
  >([]);

  useEffect(() => {
    if (key !== 'textbook') return;
    let cancelled = false;
    (async () => {
      setTextbookLoading(true);
      try {
        const [subjects, publishers] = await Promise.all([
          api.getTextbookAvailability(),
          api.getPublishers(),
        ]);
        const publisherName = new Map(publishers.map((p) => [p.id, p.name]));
        const seen = new Set<string>();
        const list: { label: string; publisherId: string; gradeId: string; subjectId: string }[] =
          [];
        for (const subject of subjects) {
          const grades = await api.getGrades(subject.subjectId);
          const availableGradeIds = new Set(subject.gradeIds ?? []);
          for (const publisherId of subject.publisherIds ?? []) {
            for (const grade of grades) {
              if (grade.chapterCount === 0) continue;
              if (availableGradeIds.size > 0 && !availableGradeIds.has(grade.id)) continue;
              const dedupeKey = `${subject.subjectId}-${publisherId}-${grade.id}`;
              if (seen.has(dedupeKey)) continue;
              seen.add(dedupeKey);
              list.push({
                label: `${subject.subjectName} · ${publisherName.get(publisherId) ?? ''} · ${grade.name}`,
                publisherId,
                gradeId: grade.id,
                subjectId: subject.subjectId,
              });
            }
          }
        }
        if (!cancelled) setTextbookOptions(list);
      } catch {
        if (!cancelled) setTextbookOptions([]);
      } finally {
        if (!cancelled) setTextbookLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    navigation.setOptions({ title: t[TITLE_KEYS[key]] });
  }, [navigation, key, t]);

  // 每个设置项组装成统一的「选项行」
  let items: { label: string; selected: boolean; onSelect: () => void }[] = [];

  if (key === 'density') {
    items = DENSITY_OPTIONS.map((opt) => ({
      label: t[opt.labelKey],
      selected: density === opt.value,
      onSelect: () => {
        dispatch(setDensity(opt.value));
        dispatch(updateSettings({ density: opt.value }));
      },
    }));
  } else if (key === 'theme') {
    items = THEME_OPTIONS.map((opt) => ({
      label: t[opt.labelKey],
      selected: theme === opt.value,
      onSelect: () => {
        dispatch(setTheme(opt.value));
        dispatch(updateSettings({ theme: opt.value }));
      },
    }));
  } else if (key === 'language') {
    items = LANGUAGE_OPTIONS.map((opt) => ({
      label: t[opt.labelKey],
      selected: language === opt.value,
      onSelect: () => {
        dispatch(setLanguage(opt.value));
        dispatch(updateSettings({ language: opt.value }));
      },
    }));
  } else if (key === 'textbook') {
    items = textbookOptions.map((opt) => ({
      label: opt.label,
      selected:
        publisherId === opt.publisherId &&
        gradeId === opt.gradeId &&
        subjectId === opt.subjectId,
      onSelect: () => {
        dispatch(setPublisherId(opt.publisherId));
        dispatch(setGradeId(opt.gradeId));
        dispatch(setSubjectId(opt.subjectId));
        dispatch(
          updateSettings({
            publisherId: opt.publisherId,
            gradeId: opt.gradeId,
            subjectId: opt.subjectId,
          }),
        );
        navigation.goBack();
      },
    }));
  } else {
    items = UNIT_SIZE_OPTIONS.map((size) => ({
      label: String(size),
      selected: unitSize === size,
      onSelect: () => {
        dispatch(setUnitSize(size));
        dispatch(updateSettings({ unitSize: size }));
      },
    }));
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      contentContainerStyle={[styles.content, { padding: 16 * spacing, paddingTop: 0, paddingBottom: 40 * spacing }]}
    >
      {key === 'textbook' && textbookLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 * spacing }} />
      ) : key === 'textbook' && items.length === 0 ? (
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 14 * font,
            textAlign: 'center',
            marginTop: 24 * spacing,
            lineHeight: 21 * font,
          }}
        >
          {t.textbookEmpty}
        </Text>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 12 * radius, paddingHorizontal: 16 * spacing }]}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.row,
                {
                  paddingVertical: 16 * spacing,
                  borderBottomColor: colors.borderLight,
                  borderBottomWidth: index === items.length - 1 ? 0 : StyleSheet.hairlineWidth,
                },
              ]}
              onPress={item.onSelect}
              activeOpacity={0.7}
            >
              <Text style={[styles.rowLabel, { color: colors.text, fontSize: 16 * font, flex: 1 }]} numberOfLines={1}>
                {item.label}
              </Text>
              {item.selected && <Ionicons name="checkmark" size={20 * font} color={colors.accent} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 16,
  },
});

export default SettingOptionScreen;

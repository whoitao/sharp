import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Chapter, Grade, TextbookSubjectAvailability } from '@sharp/shared';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { TextbookUnitsParams } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { updateSettings } from '../../stores/settingsSlice';

type NavigationProp = NativeStackNavigationProp<
  { Textbook: undefined; TextbookUnits: TextbookUnitsParams },
  'Textbook'
>;

interface TextbookScreenProps {
  navigation: NavigationProp;
}

/** 一本教材 = 科目 + 版本 + 年级册别 */
interface TextbookOption {
  subjectId: string;
  subjectName: string;
  publisherId: string;
  publisherName: string;
  grade: Grade;
}

interface FlatChapter {
  node: Chapter;
  depth: number;
  /** 章节层级路径，展示在单元列表顶部作为面包屑 */
  path: string;
}

const flattenChapters = (nodes: Chapter[], depth = 0, parentPath = ''): FlatChapter[] =>
  nodes.flatMap((node) => {
    const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
    return [
      { node, depth, path },
      ...flattenChapters(node.children ?? [], depth + 1, path),
    ];
  });

const TextbookScreen: React.FC<TextbookScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const {
    publisherId: savedPublisherId,
    gradeLevel: savedGradeLevel,
    initialized: settingsInitialized,
  } = useSelector((state: RootState) => state.settings);

  const [loading, setLoading] = useState(true);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [available, setAvailable] = useState<TextbookSubjectAvailability[]>([]);
  const [options, setOptions] = useState<TextbookOption[]>([]);
  const [selected, setSelected] = useState<TextbookOption | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectorVisible, setSelectorVisible] = useState(false);

  // 组合出可选的教材列表：有内容的科目 × 版本 × 年级册别
  const loadTextbooks = useCallback(async () => {
    const [subjects, publishers] = await Promise.all([
      api.getTextbookAvailability(),
      api.getPublishers(),
    ]);
    setAvailable(subjects);
    if (subjects.length === 0 || publishers.length === 0) {
      setOptions([]);
      setSelected(null);
      return;
    }

    const combos = subjects.flatMap((subject) =>
      publishers.map((publisher) => ({ subject, publisher })),
    );
    const gradePairs = await Promise.all(
      combos.map(async ({ subject, publisher }) => ({
        subject,
        publisher,
        grades: await api.getGrades(subject.subjectId, publisher.id),
      })),
    );

    const list: TextbookOption[] = [];
    for (const { subject, publisher, grades } of gradePairs) {
      for (const grade of grades) {
        if (grade.chapterCount === 0) continue;
        list.push({
          subjectId: subject.subjectId,
          subjectName: subject.subjectName,
          publisherId: publisher.id,
          publisherName: publisher.name,
          grade,
        });
      }
    }
    setOptions(list);
  }, []);

  const loadChapters = useCallback(async (option: TextbookOption) => {
    setChaptersLoading(true);
    try {
      const tree = await api.getChapters(option.grade.id, option.subjectId);
      setChapters(tree);
    } finally {
      setChaptersLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadTextbooks();
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [loadTextbooks]);

  // 选项加载完成后恢复「我的教材」，未设置时默认第一本
  useEffect(() => {
    // 等设置加载完成再决定默认教材，避免用空设置覆盖已保存的版本
    if (!settingsInitialized) return;
    if (options.length === 0) {
      setSelected(null);
      return;
    }
    setSelected((prev) => {
      if (prev) return prev;
      const saved = options.find(
        (option) =>
          option.publisherId === savedPublisherId && option.grade.level === savedGradeLevel,
      );
      return saved ?? options[0];
    });
  }, [options, settingsInitialized, savedPublisherId, savedGradeLevel]);

  useEffect(() => {
    if (!selected) {
      setChapters([]);
      return;
    }
    loadChapters(selected);
  }, [selected, loadChapters]);

  const flatChapters = useMemo(() => flattenChapters(chapters), [chapters]);

  const myTextbookLabel = selected
    ? `${selected.subjectName} · ${selected.publisherName} · ${selected.grade.name}`
    : t.textbookNotSet;

  const handleSelect = (option: TextbookOption) => {
    setSelected(option);
    setSelectorVisible(false);
    // 「我的教材」只持久化版本 + 年级，科目/册别从教材数据中反查
    dispatch(
      updateSettings({ publisherId: option.publisherId, gradeLevel: option.grade.level }),
    );
  };

  const handleChapterPress = (item: FlatChapter) => {
    if (!selected || item.node.questionCount === 0) return;
    navigation.navigate('TextbookUnits', {
      chapterId: item.node.id,
      chapterName: item.node.name,
      textbookLabel: `${selected.publisherName} · ${selected.grade.name}`,
      breadcrumb: item.path,
      subjectId: selected.subjectId,
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <ScrollView
        contentContainerStyle={{
          padding: 16 * spacing,
          paddingTop: 8 * spacing,
          paddingBottom: 24 * spacing,
        }}
        showsVerticalScrollIndicator={false}
      >
        {available.length === 0 ? (
          <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
            <Text style={{ fontSize: 44 * font, marginBottom: 12 * spacing }}>📚</Text>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 15 * font,
                textAlign: 'center',
                lineHeight: 22 * font,
              }}
            >
              {t.textbookEmpty}
            </Text>
          </View>
        ) : (
          <>
            {/* 我的教材：点开选择器，一次点选版本 + 年级 */}
            <TouchableOpacity
              style={[
                styles.myTextbook,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: 12 * radius,
                  padding: 14 * spacing,
                  marginBottom: 16 * spacing,
                },
              ]}
              onPress={() => setSelectorVisible(true)}
              activeOpacity={0.7}
            >
              <View
                style={{
                  backgroundColor: colors.background,
                  width: 36 * spacing,
                  height: 36 * spacing,
                  borderRadius: 10 * radius,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10 * spacing,
                }}
              >
                <Ionicons name="book-outline" size={20 * font} color={colors.accent} />
              </View>
              <View style={styles.myTextbookText}>
                <Text style={{ color: colors.textTertiary, fontSize: 12 * font }}>
                  {t.textbookMy}
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15 * font,
                    fontWeight: '600',
                    marginTop: 2 * spacing,
                  }}
                  numberOfLines={1}
                >
                  {myTextbookLabel}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18 * font} color={colors.textTertiary} />
            </TouchableOpacity>

            {chaptersLoading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 24 * spacing }} />
            ) : flatChapters.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 14 * font }}>
                {t.textbookNoChapters}
              </Text>
            ) : (
              <View
                style={[
                  styles.chapterCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: 12 * radius,
                  },
                ]}
              >
                {flatChapters.map((item, index) => {
                  const enabled = item.node.questionCount > 0;
                  return (
                    <TouchableOpacity
                      key={item.node.id}
                      style={[
                        styles.chapterRow,
                        {
                          paddingVertical: 14 * spacing,
                          paddingLeft: (14 + item.depth * 14) * spacing,
                          paddingRight: 14 * spacing,
                          borderBottomColor: colors.borderLight,
                          borderBottomWidth:
                            index === flatChapters.length - 1 ? 0 : StyleSheet.hairlineWidth,
                          opacity: enabled ? 1 : 0.45,
                        },
                      ]}
                      onPress={() => handleChapterPress(item)}
                      disabled={!enabled}
                      activeOpacity={0.7}
                    >
                      <View style={styles.chapterText}>
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: (item.depth === 0 ? 15 : 14) * font,
                            fontWeight: item.depth === 0 ? '600' : '400',
                          }}
                          numberOfLines={1}
                        >
                          {item.node.name}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: enabled ? colors.textSecondary : colors.textTertiary,
                          fontSize: 12 * font,
                          marginLeft: 8 * spacing,
                        }}
                      >
                        {enabled
                          ? t.textbookChapterQuestions(item.node.questionCount)
                          : t.textbookNoQuestions}
                      </Text>
                      {enabled && (
                        <Ionicons
                          name="chevron-forward"
                          size={16 * font}
                          color={colors.textTertiary}
                          style={{ marginLeft: 4 * spacing }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* 教材选择器：版本 + 年级组合一次点选 */}
      <Modal
        visible={selectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectorVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setSelectorVisible(false)}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderRadius: 14 * radius,
                padding: 16 * spacing,
              },
            ]}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 16 * font,
                fontWeight: '600',
                marginBottom: 12 * spacing,
              }}
            >
              {t.textbookSelectTitle}
            </Text>
            <ScrollView style={{ maxHeight: 360 * spacing }}>
              {options.map((option) => {
                const active =
                  selected?.grade.id === option.grade.id &&
                  selected?.subjectId === option.subjectId;
                return (
                  <TouchableOpacity
                    key={`${option.subjectId}-${option.grade.id}`}
                    style={[
                      styles.optionRow,
                      {
                        paddingVertical: 14 * spacing,
                        borderBottomColor: colors.borderLight,
                      },
                    ]}
                    onPress={() => handleSelect(option)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 15 * font,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {option.subjectName} · {option.publisherName} · {option.grade.name}
                    </Text>
                    {active && (
                      <Ionicons name="checkmark" size={20 * font} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center' },
  myTextbook: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  myTextbookText: { flex: 1 },
  chapterCard: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chapterText: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

export default TextbookScreen;

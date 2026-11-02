import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Chapter, Textbook, TextbookCatalog, TextbookStageGroup } from '@sharp/shared';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { setTextbookId, updateSettings } from '../../stores/settingsSlice';

type NavigationProp = NativeStackNavigationProp<
  { Textbook: undefined; TextbookUnits: TextbookUnitsParams },
  'Textbook'
>;

interface TextbookScreenProps {
  navigation: NavigationProp;
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

/** 默认定位「初中」，没有该学段时退回第一个 */
const pickDefaultStage = (stages: TextbookStageGroup[]): TextbookStageGroup | null =>
  stages.find((stage) => stage.name.includes('初中')) ?? stages[0] ?? null;

const TextbookScreen: React.FC<TextbookScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { textbookId: savedTextbookId } = useSelector((state: RootState) => state.settings);

  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<TextbookCatalog | null>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getTextbookCatalog();
        if (cancelled) return;
        setCatalog(data);

        const defaultStage = pickDefaultStage(data.stages);
        const defaultSubject = defaultStage?.subjects[0] ?? null;
        setActiveStageId(defaultStage?.id ?? null);
        setActiveSubjectId(defaultSubject?.id ?? null);

        // 恢复全局单选：优先服务端返回值，其次 Redux 里的值；都找不到时退回首本教材（仅本地高亮，不落库）
        const allTextbooks = data.stages.flatMap((stage) =>
          stage.subjects.flatMap((subject) => subject.textbooks),
        );
        const preferredId = data.selectedTextbookId ?? savedTextbookId ?? null;
        const preferred = preferredId
          ? allTextbooks.find((textbook) => textbook.id === preferredId)
          : undefined;
        if (preferred) {
          setSelectedTextbookId(preferred.id);
          setActiveStageId(preferred.stageId);
          setActiveSubjectId(preferred.subjectId);
        } else {
          setSelectedTextbookId(defaultSubject?.textbooks[0]?.id ?? null);
        }
      } catch {
        if (!cancelled) setCatalog(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // savedTextbookId 仅用于首次进入时的兜底，不随页面内切换重新拉取
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 选中教材后加载其章节树
  useEffect(() => {
    if (!selectedTextbookId) {
      setChapters([]);
      return;
    }
    let cancelled = false;
    setChaptersLoading(true);
    api
      .getChaptersByTextbook(selectedTextbookId)
      .then((tree) => {
        if (!cancelled) setChapters(tree);
      })
      .catch(() => {
        if (!cancelled) setChapters([]);
      })
      .finally(() => {
        if (!cancelled) setChaptersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTextbookId]);

  const stages = catalog?.stages ?? [];
  const activeStage = useMemo(
    () => stages.find((stage) => stage.id === activeStageId) ?? null,
    [stages, activeStageId],
  );
  const activeSubject = useMemo(
    () => activeStage?.subjects.find((subject) => subject.id === activeSubjectId) ?? null,
    [activeStage, activeSubjectId],
  );
  const selectedTextbook = useMemo(() => {
    for (const stage of stages) {
      for (const subject of stage.subjects) {
        const found = subject.textbooks.find((textbook) => textbook.id === selectedTextbookId);
        if (found) return found;
      }
    }
    return null;
  }, [stages, selectedTextbookId]);

  const flatChapters = useMemo(() => flattenChapters(chapters), [chapters]);

  const handleStagePress = (stage: TextbookStageGroup) => {
    setActiveStageId(stage.id);
    setActiveSubjectId(stage.subjects[0]?.id ?? null);
  };

  const handleTextbookPress = (textbook: Textbook) => {
    setSelectedTextbookId(textbook.id);
    // 全局单选：本地立即生效，服务端据此同步年级/科目/版本
    dispatch(setTextbookId(textbook.id));
    dispatch(updateSettings({ textbookId: textbook.id }));
  };

  const handleChapterPress = useCallback(
    (item: FlatChapter) => {
      if (!selectedTextbook || item.node.questionCount === 0) return;
      navigation.navigate('TextbookUnits', {
        chapterId: item.node.id,
        chapterName: item.node.name,
        textbookLabel: `${selectedTextbook.publisherName} · ${selectedTextbook.gradeName}${selectedTextbook.semesterLabel}`,
        breadcrumb: item.path,
        subjectId: selectedTextbook.subjectId,
      });
    },
    [navigation, selectedTextbook],
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (stages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
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
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 * spacing }}
        showsVerticalScrollIndicator={false}
      >
        {/* 学段 tab */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16 * spacing,
            paddingTop: 8 * spacing,
            paddingBottom: 8 * spacing,
          }}
        >
          {stages.map((stage) => {
            const active = stage.id === activeStageId;
            return (
              <TouchableOpacity
                key={stage.id}
                onPress={() => handleStagePress(stage)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 14 * spacing,
                  paddingVertical: 6 * spacing,
                  borderRadius: 16 * radius,
                  marginRight: 8 * spacing,
                  backgroundColor: active ? colors.accentLight : colors.surfaceSecondary,
                }}
              >
                <Text
                  style={{
                    color: active ? colors.accentStrong : colors.textSecondary,
                    fontSize: 14 * font,
                    fontWeight: active ? '600' : '400',
                  }}
                >
                  {stage.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 科目 tab */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16 * spacing,
            paddingBottom: 12 * spacing,
          }}
        >
          {(activeStage?.subjects ?? []).map((subject) => {
            const active = subject.id === activeSubjectId;
            return (
              <TouchableOpacity
                key={subject.id}
                onPress={() => setActiveSubjectId(subject.id)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 14 * spacing,
                  paddingVertical: 6 * spacing,
                  borderRadius: 16 * radius,
                  marginRight: 8 * spacing,
                  backgroundColor: active ? colors.accentLight : colors.surfaceSecondary,
                }}
              >
                <Text
                  style={{
                    color: active ? colors.accentStrong : colors.textSecondary,
                    fontSize: 14 * font,
                    fontWeight: active ? '600' : '400',
                  }}
                >
                  {subject.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 教材卡片 */}
        <View style={{ paddingHorizontal: 16 * spacing }}>
          {(activeSubject?.textbooks ?? []).map((textbook, index) => {
            const selected = textbook.id === selectedTextbookId;
            return (
              <TouchableOpacity
                key={textbook.id}
                onPress={() => handleTextbookPress(textbook)}
                activeOpacity={0.75}
                style={[
                  styles.textbookRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: selected ? colors.accent : colors.border,
                    borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
                    borderRadius: 12 * radius,
                    padding: 12 * spacing,
                    marginBottom: 12 * spacing,
                    elevation: isDark ? 0 : 2,
                    shadowOpacity: isDark ? 0 : 0.04,
                  },
                ]}
              >
                {/* 封面：竖版 3:4 */}
                {textbook.coverUrl ? (
                  <Image
                    source={textbook.coverUrl}
                    style={{
                      width: 72 * spacing,
                      aspectRatio: 3 / 4,
                      borderRadius: 8 * radius,
                    }}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View
                    style={{
                      width: 72 * spacing,
                      aspectRatio: 3 / 4,
                      borderRadius: 8 * radius,
                      backgroundColor: colors.surfaceSecondary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="book-outline" size={26 * font} color={colors.textTertiary} />
                  </View>
                )}

                <View style={[styles.textbookInfo, { marginLeft: 12 * spacing }]}>
                  <Text
                    style={{ color: colors.text, fontSize: 16 * font, fontWeight: '600' }}
                    numberOfLines={1}
                  >
                    {textbook.publisherName}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13 * font,
                      marginTop: 4 * spacing,
                    }}
                    numberOfLines={1}
                  >
                    {textbook.gradeName}
                    {textbook.semesterLabel}
                  </Text>
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 12 * font,
                      marginTop: 6 * spacing,
                    }}
                    numberOfLines={1}
                  >
                    {t.textbookChapterQuestions(textbook.questionCount)}
                  </Text>
                </View>

                <View
                  style={{
                    width: 24 * spacing,
                    height: 24 * spacing,
                    borderRadius: 12 * radius,
                    borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
                    borderColor: colors.border,
                    backgroundColor: selected ? colors.accent : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selected && (
                    <Ionicons name="checkmark" size={16 * font} color={colors.surface} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 选中教材的章节列表 */}
        {selectedTextbook && (
          <View style={{ paddingHorizontal: 16 * spacing, marginTop: 4 * spacing }}>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 12 * font,
                marginBottom: 8 * spacing,
              }}
              numberOfLines={1}
            >
              {selectedTextbook.name}
            </Text>
            {chaptersLoading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 16 * spacing }} />
            ) : flatChapters.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 14 * font }}>
                {t.textbookNoChapters}
              </Text>
            ) : (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderRadius: 12 * radius,
                  overflow: 'hidden',
                }}
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
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center' },
  textbookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  textbookInfo: { flex: 1 },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chapterText: { flex: 1 },
});

export default TextbookScreen;

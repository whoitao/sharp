import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  Chapter,
  Grade,
  KnowledgePoint,
  Subject,
  TextbookCatalog,
} from '@sharp/shared';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScopeSelector from '../../components/ScopeSelector';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { StudyStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { updateSettings } from '../../stores/settingsSlice';

type NavigationProp = NativeStackNavigationProp<StudyStackParamList, 'Study'>;

interface StudyScreenProps {
  navigation: NavigationProp;
  route: RouteProp<StudyStackParamList, 'Study'>;
}

type StudyMode = 'chapter' | 'knowledge';

interface TreeRow {
  id: string;
  name: string;
  depth: number;
  path: string;
  questionCount: number;
}

interface TreeSource {
  id: string;
  name: string;
  children?: TreeSource[];
  questionCount?: number;
}

/** 章节树 / 知识点树拍平成带缩进的行，供列表直接渲染 */
function flattenTree<T extends TreeSource>(
  nodes: T[],
  depth = 0,
  parentPath = '',
): TreeRow[] {
  return nodes.flatMap((node) => {
    const path = parentPath ? `${parentPath} / ${node.name}` : node.name;
    return [
      {
        id: node.id,
        name: node.name,
        depth,
        path,
        questionCount: node.questionCount ?? 0,
      },
      ...flattenTree((node.children ?? []) as T[], depth + 1, path),
    ];
  });
}

const StudyScreen: React.FC<StudyScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const {
    gradeId: savedGradeId,
    subjectId: savedSubjectId,
    publisherId: savedPublisherId,
    textbookId: savedTextbookId,
  } = useSelector((state: RootState) => state.settings);

  const [mode, setMode] = useState<StudyMode>('chapter');
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [catalog, setCatalog] = useState<TextbookCatalog | null>(null);

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [kps, setKps] = useState<KnowledgePoint[]>([]);
  const [kpsLoading, setKpsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [subs, gradeList, catalogData] = await Promise.all([
          api.getSubjects(),
          api.getGrades(),
          api.getTextbookCatalog().catch(() => null),
        ]);
        if (cancelled) return;
        setSubjects(subs);
        setGrades(gradeList);
        setCatalog(catalogData);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 全局范围是唯一数据源：教材选择会把年级/科目反推写回 Redux，
  // 这里跟随 Redux 更新本地展示状态，选中教材后学习页无需手动刷新。
  useEffect(() => {
    if (grades.length === 0) return;
    setSelectedGrade(grades.find((grade) => grade.id === savedGradeId) ?? null);
  }, [savedGradeId, grades]);

  useEffect(() => {
    if (subjects.length === 0) return;
    setSelectedSubject(subjects.find((subject) => subject.id === savedSubjectId) ?? null);
  }, [savedSubjectId, subjects]);

  // 首页点学科行进入：科目列表到位后自动选中该学科，然后立刻清掉参数
  const requestedSubjectId = route.params?.subjectId;
  useEffect(() => {
    if (!requestedSubjectId || subjects.length === 0) return;
    const target = subjects.find((subject) => subject.id === requestedSubjectId);
    navigation.setParams({ subjectId: undefined });
    if (target) setSelectedSubject(target);
  }, [requestedSubjectId, subjects, navigation]);

  // 当前全局教材（用于「按章节学」），并要求与当前年级/科目一致
  const scopeTextbook = useMemo(() => {
    if (!catalog || !savedTextbookId) return null;
    const textbook = catalog.stages
      .flatMap((stage) => stage.subjects.flatMap((subject) => subject.textbooks))
      .find((item) => item.id === savedTextbookId);
    if (!textbook) return null;
    if (selectedSubject && textbook.subjectId !== selectedSubject.id) return null;
    if (selectedGrade && textbook.gradeId !== selectedGrade.id) return null;
    return textbook;
  }, [catalog, savedTextbookId, selectedSubject, selectedGrade]);

  // 按章节学：加载当前教材的章节树
  useEffect(() => {
    if (mode !== 'chapter' || !scopeTextbook) {
      setChapters([]);
      return;
    }
    let cancelled = false;
    setChaptersLoading(true);
    api
      .getChaptersByTextbook(scopeTextbook.id)
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
  }, [mode, scopeTextbook]);

  // 按知识点学：按 科目 + 年级 + 教材版本 拉取知识点树
  useEffect(() => {
    if (mode !== 'knowledge' || !selectedSubject) {
      setKps([]);
      return;
    }
    let cancelled = false;
    setKpsLoading(true);
    api
      .getKnowledgePoints(
        selectedSubject.id,
        selectedGrade?.stageId,
        selectedGrade?.id ?? null,
        savedPublisherId,
      )
      .then((tree) => {
        if (!cancelled) setKps(tree);
      })
      .catch(() => {
        if (!cancelled) setKps([]);
      })
      .finally(() => {
        if (!cancelled) setKpsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, selectedSubject, selectedGrade?.stageId, selectedGrade?.id, savedPublisherId]);

  const chapterRows = useMemo(() => flattenTree(chapters), [chapters]);
  const kpRows = useMemo(() => flattenTree(kps), [kps]);

  // 顶部 tab 切换
  const handleSwitchMode = useCallback((next: StudyMode) => {
    setMode(next);
  }, []);

  // 按章节学：点章节进入该章节的题单列表
  const handleChapterPress = useCallback(
    (row: TreeRow) => {
      if (!scopeTextbook || row.questionCount === 0) return;
      navigation.navigate('TextbookUnits', {
        chapterId: row.id,
        chapterName: row.name,
        textbookLabel: `${scopeTextbook.publisherName} · ${scopeTextbook.gradeName}${scopeTextbook.semesterLabel}`,
        breadcrumb: row.path,
        subjectId: scopeTextbook.subjectId,
      });
    },
    [navigation, scopeTextbook]
  );

  // 按知识点学：点知识点进入该知识点的题单列表
  const handleKnowledgePress = useCallback(
    (row: TreeRow) => {
      if (!selectedSubject || row.questionCount === 0) return;
      navigation.navigate('KnowledgeUnits', {
        knowledgePointId: row.id,
        knowledgePointName: row.name,
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        gradeId: selectedGrade?.id ?? null,
        publisherId: savedPublisherId ?? null,
        scopeLabel: `${selectedSubject.name}${selectedGrade ? ` · ${selectedGrade.name}` : ''}`,
      });
    },
    [navigation, selectedSubject, selectedGrade, savedPublisherId]
  );

  // 全局学习范围变更后持久化，首页/教材/记录页共用
  const handleSelectGrade = useCallback(
    (grade: Grade | null) => {
      setSelectedGrade(grade);
      dispatch(updateSettings({ gradeId: grade?.id ?? null }));
    },
    [dispatch]
  );

  const handleSelectSubject = useCallback(
    (subject: Subject | null) => {
      setSelectedSubject(subject);
      dispatch(updateSettings({ subjectId: subject?.id ?? null }));
    },
    [dispatch]
  );

  // 全局「年级 + 科目」常驻原生 header 右上角，与首页一致
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ marginRight: 16 }}>
          <ScopeSelector
            grades={grades}
            subjects={subjects}
            selectedGrade={selectedGrade}
            selectedSubject={selectedSubject}
            onChangeGrade={handleSelectGrade}
            onChangeSubject={handleSelectSubject}
          />
        </View>
      ),
    });
  }, [
    navigation,
    grades,
    subjects,
    selectedGrade,
    selectedSubject,
    handleSelectGrade,
    handleSelectSubject,
  ]);

  const renderTreeRows = useCallback(
    (rows: TreeRow[], onPress: (row: TreeRow) => void) => (
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: 12 * radius,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, index) => {
          const enabled = row.questionCount > 0;
          return (
            <TouchableOpacity
              key={row.id}
              activeOpacity={0.7}
              disabled={!enabled}
              onPress={() => onPress(row)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12 * spacing,
                paddingLeft: (12 + row.depth * 12) * spacing,
                paddingRight: 12 * spacing,
                borderBottomWidth: index === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                borderBottomColor: colors.borderLight,
                opacity: enabled ? 1 : 0.45,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  color: colors.text,
                  fontSize: (row.depth === 0 ? 14 : 13) * font,
                  fontWeight: row.depth === 0 ? '600' : '400',
                }}
                numberOfLines={1}
              >
                {row.name}
              </Text>
              <Text
                style={{
                  color: enabled ? colors.textSecondary : colors.textTertiary,
                  fontSize: 11 * font,
                  marginLeft: 6 * spacing,
                }}
              >
                {enabled ? t.textbookChapterQuestions(row.questionCount) : t.noData}
              </Text>
              {enabled && (
                <Ionicons
                  name="chevron-forward"
                  size={14 * font}
                  color={colors.textTertiary}
                  style={{ marginLeft: 3 * spacing }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    ),
    [colors, spacing, font, radius, t],
  );

  const renderHint = useCallback(
    (text: string) => (
      <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
        <Text style={[styles.emptyIcon, { fontSize: 48 * font, marginBottom: 12 * spacing }]}>📚</Text>
        <Text style={[styles.emptyText, { color: colors.textTertiary, fontSize: 16 * font }]}>
          {text}
        </Text>
      </View>
    ),
    [spacing, font, colors.textTertiary],
  );

  const renderChapterTab = () => {
    if (!scopeTextbook) return renderHint(t.studySelectTextbookFirst);
    if (chaptersLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }
    if (chapterRows.length === 0) return renderHint(t.textbookNoChapters);
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 12 * spacing }}
      >
        <Text style={{ color: colors.textTertiary, fontSize: 12 * font, marginBottom: 8 * spacing }}>
          {scopeTextbook.publisherName} · {scopeTextbook.gradeName}
          {scopeTextbook.semesterLabel}
        </Text>
        {renderTreeRows(chapterRows, handleChapterPress)}
      </ScrollView>
    );
  };

  const renderKnowledgeTab = () => {
    if (!selectedSubject) return renderHint(t.studySelectSubjectFirst);
    if (kpsLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }
    if (kpRows.length === 0) return renderHint(t.noData);
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 12 * spacing }}
      >
        <Text style={{ color: colors.textTertiary, fontSize: 12 * font, marginBottom: 8 * spacing }}>
          {selectedSubject.name}
          {selectedGrade ? ` · ${selectedGrade.name}` : ''}
        </Text>
        {renderTreeRows(kpRows, handleKnowledgePress)}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* 顶部 tab：按章节学 / 按知识点学 */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 16 * spacing,
          marginTop: 0,
          padding: 3 * spacing,
          borderRadius: 10 * radius,
          backgroundColor: colors.surfaceSecondary,
        }}
      >
        {([
          { key: 'chapter' as const, label: t.studyByChapter },
          { key: 'knowledge' as const, label: t.studyByKnowledgePoint },
        ]).map((tab) => {
          const active = mode === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.8}
              onPress={() => handleSwitchMode(tab.key)}
              style={{
                flex: 1,
                paddingVertical: 8 * spacing,
                borderRadius: 8 * radius,
                backgroundColor: active ? colors.surface : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: active ? colors.accent : colors.textSecondary,
                  fontSize: 14 * font,
                  fontWeight: active ? '600' : '400',
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 16 * spacing,
          paddingTop: 12 * spacing,
        }}
      >
        {mode === 'chapter' ? renderChapterTab() : renderKnowledgeTab()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16 },
});

export default StudyScreen;

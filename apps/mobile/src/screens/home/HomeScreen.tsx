import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Grade, Subject, SubjectOverview } from '@sharp/shared';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScopeSelector from '../../components/ScopeSelector';
import StreakBadge from '../../components/StreakBadge';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { updateSettings } from '../../stores/settingsSlice';
import QuickEntry from './QuickEntry';
import SubjectCarousel from './SubjectCarousel';
import SubjectRow from './SubjectRow';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: NavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { gradeId, subjectId } = useSelector((state: RootState) => state.settings);
  const [subjects, setSubjects] = useState<SubjectOverview[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<Subject[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  // 有教材内容时才露出「教材同步」入口
  const [textbookAvailable, setTextbookAvailable] = useState(false);

  // 全局「年级 + 科目」选择器：选中项从设置中还原
  const selectedGrade = useMemo(
    () => grades.find((grade) => grade.id === gradeId) ?? null,
    [grades, gradeId],
  );
  const selectedSubject = useMemo(
    () => subjectOptions.find((subject) => subject.id === subjectId) ?? null,
    [subjectOptions, subjectId],
  );

  // 进入首页后的空余时间预拉取学习页搜索数据（分类/科目），
  // api 内部做缓存优先 + 并发去重，与学习页同时挂载也不会产生重复请求
  // 知识点按学科过滤，改为选中学科后再拉取，这里不预取
  useEffect(() => {
    api.getCategories('0').catch(() => {});
    api.getSubjects().catch(() => {});
  }, []);

  // 首页属于 HomeStack，学习/我的在另外两个 Tab：navigate 会冒泡到父级 Tab 导航器
  const navigateToTab = useCallback(
    (tab: 'StudyTab' | 'ProfileTab', params?: object) => {
      (navigation as any).navigate(tab, params);
    },
    [navigation]
  );

  // 点学科行/继续练习：带上 subjectId 直达筛选后的学习页
  const goToStudy = useCallback(
    (subjectId?: string) => {
      navigateToTab('StudyTab', {
        screen: 'Study',
        params: subjectId ? { subjectId } : undefined,
      });
    },
    [navigateToTab]
  );

  // 连续天数画在原生 header 右侧：与标题同一行，不挤占内容区
  useEffect(() => {
    if (streak <= 0) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }
    navigation.setOptions({ headerRight: () => <StreakBadge days={streak} /> });
  }, [navigation, streak]);

  const loadHome = useCallback(async () => {
    const [overview, stats, availability, gradeList, subjectList] = await Promise.all([
      api.getSubjectOverview(),
      api.getStats(),
      api.getTextbookAvailability(),
      api.getGrades(),
      api.getSubjects(),
    ]);
    setSubjects(overview);
    setStreak(stats.streak);
    setTextbookAvailable(availability.length > 0);
    setGrades(gradeList);
    setSubjectOptions(subjectList);
    setLoading(false);
  }, []);

  // 学习范围变更后写入用户设置，学习页/教材页/记录页共用
  const handleChangeGrade = useCallback(
    (grade: Grade | null) => {
      dispatch(updateSettings({ gradeId: grade?.id ?? null }));
    },
    [dispatch],
  );

  const handleChangeSubject = useCallback(
    (subject: Subject | null) => {
      dispatch(updateSettings({ subjectId: subject?.id ?? null }));
    },
    [dispatch],
  );

  // 每次回到首页都刷新：从练习页返回时已学比例要跟着变
  useFocusEffect(
    useCallback(() => {
      loadHome().catch(() => setLoading(false));
    }, [loadHome])
  );

  // 轮播只放有题目的学科：先"学过没学完"（进度高的在前），再学完的，最后没开始的（题多的在前）
  const carouselItems = useMemo(() => {
    const available = subjects.filter((subject) => subject.questionCount > 0);
    const rank = (subject: SubjectOverview) => {
      if (subject.progress > 0 && subject.progress < 100) return 0;
      if (subject.progress >= 100) return 1;
      return 2;
    };
    return [...available].sort(
      (a, b) => rank(a) - rank(b) || b.progress - a.progress || b.questionCount - a.questionCount
    );
  }, [subjects]);

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16 * spacing,
          paddingTop: 4 * spacing,
          paddingBottom: 24 * spacing,
        }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 32 * spacing }} />
        ) : (
          <>
            {/* 全局学习范围：年级 + 科目（常驻顶部） */}
            <View style={{ marginBottom: 10 * spacing }}>
              <ScopeSelector
                grades={grades}
                subjects={subjectOptions}
                selectedGrade={selectedGrade}
                selectedSubject={selectedSubject}
                onChangeGrade={handleChangeGrade}
                onChangeSubject={handleChangeSubject}
              />
            </View>

            <SubjectCarousel
              items={carouselItems}
              onSelect={goToStudy}
              onFallbackPress={() => goToStudy(selectedSubject?.id)}
            />

            <View style={[styles.quickRow, { gap: 8 * spacing, marginTop: 12 * spacing }]}>
              <QuickEntry
                icon="calendar-outline"
                label={t.studyByKnowledge}
                onPress={() => goToStudy(selectedSubject?.id)}
              />
              <QuickEntry
                icon="bookmark-outline"
                label={t.wrongQuestions}
                onPress={() => navigation.navigate('WrongQuestions')}
              />
              <QuickEntry
                icon="bar-chart-outline"
                label={t.homeReport}
                onPress={() => navigation.navigate('Records')}
              />
              {textbookAvailable && (
                <QuickEntry
                  icon="library-outline"
                  label={t.textbookTitle}
                  onPress={() => navigation.navigate('Textbook')}
                />
              )}
            </View>

            <View
              style={[
                styles.section,
                { marginTop: 18 * spacing, marginBottom: 9 * spacing, paddingHorizontal: 2 * spacing },
              ]}
            >
              <Text style={{ color: colors.text, fontSize: 15 * font, fontWeight: '700' }}>
                {t.homeSubjects}
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: 11.5 * font }}>
                {t.homeSubjectCount(subjects.length)}
              </Text>
            </View>

            {subjects.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 14 * font }}>{t.noData}</Text>
            ) : (
              <View style={{ gap: 9 * spacing }}>
                {subjects.map((subject) => (
                  <SubjectRow key={subject.id} item={subject} onPress={() => goToStudy(subject.id)} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  quickRow: {
    flexDirection: 'row',
  },
  section: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
});

export default HomeScreen;

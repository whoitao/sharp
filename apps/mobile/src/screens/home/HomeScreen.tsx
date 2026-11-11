import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Grade, PetDetail, QuestionTag, Subject, SubjectOverview } from '@sharp/shared';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScopeSelectorHeader from '../../components/ScopeSelectorHeader';
import StreakBadge from '../../components/StreakBadge';
import TagFilterBar from '../../components/TagFilterBar';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { updateSettings } from '../../stores/settingsSlice';
import PetCard from './PetCard';
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
  // 左侧连续天数徽章的实际宽度：居中后的教材胶囊要避开它
  const [streakWidth, setStreakWidth] = useState(0);
  // 站内信未读数：首页右上角铃铛红点
  const [unreadCount, setUnreadCount] = useState(0);
  // 首页宠物卡片：未领养时为 null
  const [pet, setPet] = useState<PetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  // 有教材内容时才露出「教材同步」入口
  const [textbookAvailable, setTextbookAvailable] = useState(false);
  // 题目标签：后端 QuestionTag 表（type=source，questionCount=0 的标签自动隐藏）
  const [tags, setTags] = useState<QuestionTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  // 全局「年级 + 科目」选择器：选中项从设置中还原
  const selectedGrade = useMemo(
    () => grades.find((grade) => grade.id === gradeId) ?? null,
    [grades, gradeId],
  );
  const selectedSubject = useMemo(
    () => subjectOptions.find((subject) => subject.id === subjectId) ?? null,
    [subjectOptions, subjectId],
  );

  // 进入首页后的空余时间预拉取学习页搜索数据（科目），
  // api 内部做缓存优先 + 并发去重，与学习页同时挂载也不会产生重复请求
  // 知识点按学科过滤，改为选中学科后再拉取，这里不预取。
  // 标签在首页挂载时拉一次，切 tab 回来不重新拉（标签稳定）
  useEffect(() => {
    api.getSubjects().catch(() => {});
    api.getTags().then((list) => {
      // 只展示有题目的标签；空标签在列表里没有意义
      setTags(list.filter((t) => (t.questionCount ?? 0) > 0));
      setSelectedTagId(null);
    });
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

  // 连续天数画在原生 header 左侧：中间留给「年级 + 科目」选择器
  useEffect(() => {
    if (streak <= 0) {
      navigation.setOptions({ headerLeft: undefined });
      return;
    }
    navigation.setOptions({
      headerLeft: () => (
        // Web 端 headerLeft 从容器 x=0 起排，需要补内容区的 16 左边距；
        // 原生 header 自带 leading inset（等于内容区 16），再加会右移
        <View
          testID="home-streak"
          onLayout={(event) => setStreakWidth(event.nativeEvent.layout.width)}
          style={Platform.OS === 'web' ? { marginLeft: 16 } : undefined}
        >
          <StreakBadge days={streak} />
        </View>
      ),
    });
  }, [navigation, streak]);

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

  // 全局学习范围（年级 + 科目）画在原生 header 正中间：
  // 左侧「连续 N 天」与右侧铃铛占用的宽度由选择器自己收敛，长教材名尾部省略
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <ScopeSelectorHeader
          grades={grades}
          subjects={subjectOptions}
          selectedGrade={selectedGrade}
          selectedSubject={selectedSubject}
          onChangeGrade={handleChangeGrade}
          onChangeSubject={handleChangeSubject}
          // 徽章还没量到宽度时按「连续 4 天」的典型宽度预留，避免胶囊先宽后窄的跳动
          leftOccupiedWidth={streak > 0 ? streakWidth || 88 : 0}
          // 铃铛图标 22 + 左右 padding 4
          rightOccupiedWidth={30}
        />
      ),
    });
  }, [
    navigation,
    grades,
    subjectOptions,
    selectedGrade,
    selectedSubject,
    handleChangeGrade,
    handleChangeSubject,
    streak,
    streakWidth,
  ]);

  // 首页重新获得焦点时刷新未读数：打开消息中心、标记已读后回来即同步
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      api.getNotificationUnreadCount().then((count) => {
        // 请求失败返回 null，保持上一次结果
        if (!cancelled && count !== null) setUnreadCount(count);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // 站内信入口从「我的」页头挪到首页右上角，行为保持不变
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          // 在当前 HomeTab 栈内打开消息中心：返回（含系统返回/手势）回到首页
          onPress={() => navigation.navigate('Notifications')}
          style={[styles.headerIcon, { marginRight: 12 }]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t.notificationsTitle}
        >
          <Ionicons name="notifications-outline" size={18 * font} color={colors.text} />
          {unreadCount > 0 && (
            <View
              style={[
                styles.unreadBadge,
                {
                  backgroundColor: colors.error,
                  minWidth: 14 * font,
                  height: 14 * font,
                  borderRadius: 7 * font,
                  paddingHorizontal: 3,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.surface,
                  fontSize: 9 * font,
                  fontWeight: '700',
                }}
              >
                {unreadCount > 99 ? '99+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, navigateToTab, unreadCount, colors, font, t.notificationsTitle]);

  const loadHome = useCallback(async () => {
    const [overview, stats, availability, gradeList, subjectList, petHome] = await Promise.all([
      api.getSubjectOverview(selectedTagId ? [selectedTagId] : undefined),
      api.getStats(),
      api.getTextbookAvailability(),
      api.getGrades(),
      api.getSubjects(),
      api.getPet().catch(() => null),
    ]);
    setSubjects(overview);
    setStreak(stats.streak);
    setTextbookAvailable(availability.length > 0);
    setGrades(gradeList);
    setSubjectOptions(subjectList);
    setPet(petHome?.pet ?? null);
    setLoading(false);
  }, [selectedTagId]);

  // 每次回到首页都刷新：从练习页返回时已学比例要跟着变；
  // selectedTagId 变化时同样触发（切 tag 后列表要重算题数）
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
          paddingTop: 0,
          paddingBottom: 12 * spacing,
        }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 32 * spacing }} />
        ) : (
          <>
            <SubjectCarousel
              items={carouselItems}
              onSelect={goToStudy}
              onFallbackPress={() => goToStudy(selectedSubject?.id)}
            />

            <View style={{ marginTop: 12 * spacing }}>
              <PetCard
                pet={pet}
                onPress={() => navigation.navigate(pet ? 'Pet' : 'PetAdopt')}
              />
            </View>

            <View
              testID="home-quick-row"
              style={[styles.quickRow, { gap: 8 * spacing, marginTop: 12 * spacing }]}
            >
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
              <QuickEntry
                icon="newspaper-outline"
                label={t.articles}
                onPress={() => navigation.navigate('Articles')}
              />
            </View>

            <View
              style={[
                styles.section,
                { marginTop: 18 * spacing, marginBottom: 9 * spacing, paddingHorizontal: 2 * spacing },
              ]}
            >
              <Text style={{ color: colors.text, fontSize: 15 * font, fontWeight: '700' }}>
                {selectedSubject ? t.homeCurrentSubject : t.homeSubjects}
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: 11.5 * font }}>
                {selectedSubject
                  ? `${selectedSubject.name}`
                  : t.homeSubjectCount(subjects.length)}
              </Text>
            </View>

            {/* 标签筛选条：空标签自动隐藏（questionCount=0 已在拉取时过滤） */}
            {tags.length > 0 && (
              <TagFilterBar
                tags={tags}
                selectedTagId={selectedTagId}
                onSelectTag={setSelectedTagId}
              />
            )}

            {subjects.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 14 * font, marginTop: 12 * spacing }}>{t.noData}</Text>
            ) : selectedSubject ? (
              // 选了具体科目：只显示该科目的单卡片
              <View style={{ gap: 9 * spacing, marginTop: 12 * spacing }}>
                {subjects
                  .filter((s) => s.id === selectedSubject.id)
                  .map((subject) => (
                    <SubjectRow key={subject.id} item={subject} onPress={() => goToStudy(subject.id)} />
                  ))}
              </View>
            ) : (
              // 没选科目：显示所有学科列表
              <View style={{ gap: 9 * spacing, marginTop: 12 * spacing }}>
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
  /** 右侧铃铛：透明底，保留 32×32 点击区域与角标定位 */
  headerIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;

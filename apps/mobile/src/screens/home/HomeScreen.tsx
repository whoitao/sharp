import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Grade, PetDetail, QuestionTag, Subject, SubjectOverview } from '@sharp/shared';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScopeHintOverlay from '../../components/ScopeHintOverlay';
import type { ScopeSelectorHandle } from '../../components/ScopeSelector';
import ScopeSelectorHeader from '../../components/ScopeSelectorHeader';
import StreakBadge, { STREAK_BADGE_PAD } from '../../components/StreakBadge';
import TagFilterBar from '../../components/TagFilterBar';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { ackScopeHint, updateSettings } from '../../stores/settingsSlice';
import {
  clearPendingScopeHint,
  hasPendingScopeHint,
  hasSeenScopeHint,
  markScopeHintSeen,
} from '../../utils/scopeHintStorage';
import PetCard from './PetCard';
import QuickEntry from './QuickEntry';
import SubjectCarousel from './SubjectCarousel';
import SubjectRow from './SubjectRow';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: NavigationProp;
}

/** 首页内容区左右内边距：卡片右边界在距屏幕右边 16 处，铃铛要和它同一条右准线 */
const PAGE_INSET = 16;

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { gradeId, subjectId, textbookId, scopeHintSeenAt, initialized: settingsInitialized, synced: settingsSynced } =
    useSelector((state: RootState) => state.settings);
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  // 教材选择器实例：首次引导需要「测量胶囊位置」和「替用户打开选择器」
  const scopeSelectorRef = useRef<ScopeSelectorHandle>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintRect, setHintRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  // 本次会话是否已经触发过，避免首页数据反复刷新导致重复弹层
  const hintAttemptedRef = useRef(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // 教材胶囊渲染在原生 header 里：RN 的 measureInWindow 在 react-native-screens
  // 的原生 header 节点上返回的是「屏幕内容区（header 下沿）」坐标系，y 会是负数，
  // 必须补回 header 高度才是真正的窗口坐标
  const headerHeight = useHeaderHeight();
  const bellRef = useRef<View>(null);
  const streakRef = useRef<View>(null);
  // header 两端自带的留白各端不同（iOS 26 玻璃按钮更贴边），
  // 实测铃铛左边缘、连续天数右边缘与内容准线的差值再用 margin 补回，不靠出血对齐
  const [bellLeftGap, setBellLeftGap] = useState(0);
  const [streakRightGap, setStreakRightGap] = useState(0);
  const [subjects, setSubjects] = useState<SubjectOverview[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<Subject[]>([]);
  const [streak, setStreak] = useState(0);
  // 右侧连续天数徽章的实际宽度：居中后的教材胶囊要避开它
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

  // header 两端都要让「可见内容」落在页面 16 的准线上：实测容器边缘与准线差多少就补多少 margin，
  // 收敛后 delta 为 0 不再 setState。容器自带的透明留白（徽章的右内边距）用 bleed 扣掉，
  // 否则会按外沿对齐、文字反而缩进去一截
  const measureEdgeGap = useCallback(
    (
      ref: React.RefObject<View | null>,
      side: 'left' | 'right',
      setGap: React.Dispatch<React.SetStateAction<number>>,
      bleed = 0,
    ) => () => {
      ref.current?.measureInWindow((x, _y, width) => {
        if (!width) return;
        const delta =
          side === 'left'
            ? Math.round(PAGE_INSET - bleed - x)
            : Math.round(x + width - (windowWidth - PAGE_INSET + bleed));
        if (Math.abs(delta) >= 1) setGap((gap) => gap + delta);
      });
    },
    [windowWidth],
  );

  // Web 端 headerLeft 从容器 x=0 起排，先补上内容区的 16 左边距；
  // 原生 header 自带 leading inset（等于 16），再由实测差值微调
  const bellLeftMargin = (Platform.OS === 'web' ? PAGE_INSET : 0) + bellLeftGap;

  // 站内信入口画在原生 header 左侧：中间留给「年级 + 科目」选择器
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          ref={bellRef}
          onLayout={measureEdgeGap(bellRef, 'left', setBellLeftGap)}
          // 在当前 HomeTab 栈内打开消息中心：返回（含系统返回/手势）回到首页
          onPress={() => navigation.navigate('Notifications')}
          // 容器贴着字形左缘排布，左边缘就是图标左边缘，实测准线才和下方卡片一致；
          // 点击区不足 40 宽，用 hitSlop 补回
          hitSlop={{ top: 4, bottom: 4, left: 6, right: 10 }}
          style={[styles.headerIcon, bellLeftMargin !== 0 ? { marginLeft: bellLeftMargin } : null]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t.notificationsTitle}
        >
          {/* 图标居中，与右侧连续天数徽章共用 header 的垂直中线；角标绝对定位不参与布局 */}
          <Ionicons
            name="notifications-outline"
            size={18 * font}
            color={colors.text}
          />
          {/* 只提示「有未读」，不提示几条：数字留给消息页 */}
          {unreadCount > 0 && (
            <View
              style={[
                styles.unreadBadge,
                {
                  backgroundColor: colors.error,
                  width: 8 * font,
                  height: 8 * font,
                  borderRadius: 4 * font,
                },
              ]}
            />
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, unreadCount, colors, font, t.notificationsTitle, bellLeftMargin, measureEdgeGap]);

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
  // 左侧铃铛与右侧「连续 N 天」占用的宽度由选择器自己收敛，长教材名尾部省略
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <ScopeSelectorHeader
          ref={scopeSelectorRef}
          grades={grades}
          subjects={subjectOptions}
          selectedGrade={selectedGrade}
          selectedSubject={selectedSubject}
          onChangeGrade={handleChangeGrade}
          onChangeSubject={handleChangeSubject}
          // 铃铛容器（字形 + 角标留白）加 hitSlop 约 40，header 自带的 16 边距不计入
          leftOccupiedWidth={40}
          // 徽章还没量到宽度时按「连续 4 天」的典型宽度预留，避免胶囊先宽后窄的跳动
          rightOccupiedWidth={streakWidth || 88}
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

  // 连续天数画在原生 header 右侧：0 天也保留徽章，它同时是学习记录的入口，隐藏会让入口消失
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View
          ref={streakRef}
          testID="home-streak"
          onLayout={(event) => {
            setStreakWidth(event.nativeEvent.layout.width);
            // 徽章的 8 留白是透明的：让容器外沿越过准线同样的距离，文字右缘才正好压线
            measureEdgeGap(streakRef, 'right', setStreakRightGap, STREAK_BADGE_PAD * spacing)();
          }}
          // marginRight 由实测差值补齐，可正可负：负值只是把透明留白挪出准线，字形不会溢出屏幕
          style={streakRightGap !== 0 ? { marginRight: streakRightGap } : undefined}
        >
          <StreakBadge days={streak} onPress={() => navigation.navigate('Records')} />
        </View>
      ),
    });
  }, [navigation, streak, streakRightGap, spacing, measureEdgeGap]);

  // 首次登录引导：没选教材 + 没处理过 + 首页真实空态，三者同时成立才弹
  // 「首页空态」不能用 subjects.length 判断：科目概览接口返回的是全量科目，
  // 任何账号（包括刚注册、从未学过的新用户）都非空，原来的 `subjects.length === 0`
  // 会让引导永远不触发。改成用户维度的信号：概览已拿到、且所有科目已学数都为 0
  const hasNoLearning =
    subjects.length > 0 && subjects.every((subject) => (subject.learnedCount ?? 0) === 0);

  const hintEligible =
    settingsInitialized &&
    // 设置没拉到服务端时不能把「textbookId 为空」当成真的没选教材
    settingsSynced &&
    !!userId &&
    !textbookId &&
    !scopeHintSeenAt &&
    !loading &&
    hasNoLearning;

  // 坐标合理性：宽高不能为 0、不能被刘海/状态栏覆盖、不能越出屏幕四周
  const isRectUsable = useCallback(
    (rect: { x: number; y: number; width: number; height: number }) => {
      const { x, y, width, height } = rect;
      if (![x, y, width, height].every((value) => Number.isFinite(value))) return false;
      if (width < 40 || height < 20) return false;
      if (y < insets.top - 1) return false;
      if (y + height > windowHeight) return false;
      if (x < -1 || x + width > windowWidth + 1) return false;
      return true;
    },
    [insets.top, windowHeight, windowWidth],
  );

  const measureCapsule = useCallback(() => {
    const tryMeasure = (attempt: number) => {
      const finish = (rect: { x: number; y: number; width: number; height: number } | null) => {
        setHintRect(rect);
        setHintVisible(true);
      };
      const selector = scopeSelectorRef.current;
      if (!selector) {
        if (attempt === 0) {
          setTimeout(() => tryMeasure(1), 150);
          return;
        }
        finish(null);
        return;
      }
      selector.measure((raw) => {
        // 原生 header 里的节点：y 是相对 header 下沿的内容区坐标，补回 header 高度
        const rect = raw ? { ...raw, y: raw.y + headerHeight } : null;
        if (rect && isRectUsable(rect)) {
          finish(rect);
          return;
        }
        // 布局尚未稳定时可能量到 0/负值：下一帧再测一次
        if (attempt === 0) {
          setTimeout(() => tryMeasure(1), 150);
          return;
        }
        // 两次都不可用：不挖洞、气泡居中，绝不让高亮框落到刘海或屏幕外
        finish(null);
      });
    };
    tryMeasure(0);
  }, [headerHeight, isRectUsable]);

  useEffect(() => {
    if (!hintEligible || hintAttemptedRef.current) return;
    const uid = userId;
    if (!uid) return;
    let cancelled = false;
    // 稍等 header 完成布局再测量，避免高亮框跑偏
    const timer = setTimeout(async () => {
      const seenLocally = await hasSeenScopeHint(uid).catch(() => false);
      if (cancelled || seenLocally) return;
      hintAttemptedRef.current = true;
      measureCapsule();
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hintEligible, userId, measureCapsule]);

  // 旋转 / 分屏后重新测量，保证挖洞和选择器位置对得上
  useEffect(() => {
    if (!hintVisible) return;
    measureCapsule();
  }, [windowWidth, windowHeight, hintVisible, measureCapsule]);

  // 离开首页时收起但不标记，回到首页仍可再提示
  useFocusEffect(
    useCallback(() => {
      return () => {
        setHintVisible(false);
        hintAttemptedRef.current = false;
      };
    }, [])
  );

  // 处理引导：本地先记，服务端失败时保留待上报，下次启动补写
  const closeScopeHint = useCallback(
    (openSelector: boolean) => {
      setHintVisible(false);
      if (userId) {
        // 先落本地标记再上报，避免上报成功清掉 pending 后又被本地写入覆盖
        markScopeHintSeen(userId)
          .catch(() => {})
          .finally(() => {
            dispatch(ackScopeHint());
          });
      } else {
        dispatch(ackScopeHint());
      }
      if (openSelector) {
        // 等蒙层淡出后再打开三步选择，避免两个 Modal 同时挂载互相遮挡
        setTimeout(() => scopeSelectorRef.current?.open(), 220);
      }
    },
    [dispatch, userId]
  );

  // 启动补报：服务端仍未标记但本地有待上报时静默重试
  useEffect(() => {
    if (!settingsInitialized || !userId) return;
    if (scopeHintSeenAt) {
      clearPendingScopeHint(userId).catch(() => {});
      return;
    }
    let cancelled = false;
    hasPendingScopeHint(userId)
      .then((pending) => {
        if (!cancelled && pending) dispatch(ackScopeHint());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [settingsInitialized, scopeHintSeenAt, userId, dispatch]);

  const loadHome = useCallback(async () => {
    const [overview, stats, availability, gradeList, subjectList, petHome] = await Promise.all([
      api.getSubjectOverview(selectedTagId ? [selectedTagId] : undefined),
      api.getStats('all').catch(() => null),
      api.getTextbookAvailability(),
      api.getGrades(),
      api.getSubjects(),
      api.getPet().catch(() => null),
    ]);
    setSubjects(overview);
    setStreak(stats?.streak ?? 0);
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

            <View style={{ marginTop: 12 * spacing }}>
              <PetCard
                pet={pet}
                onPress={() => navigation.navigate(pet ? 'Pet' : 'PetAdopt')}
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

      <ScopeHintOverlay
        visible={hintVisible}
        targetRect={hintRect}
        onSelect={() => closeScopeHint(true)}
        onDismiss={() => closeScopeHint(false)}
      />
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
  /** header 左侧铃铛：容器左缘即图标左缘，与下方卡片共用同一条 16 准线 */
  headerIcon: {
    // 高度 40 不超过 header 44 的内容区，图标垂直居中、靠左排布；
    // 右侧预留 6 给未读红点，红点贴着铃铛右上角但不会超出容器
    height: 40,
    paddingRight: 6,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: 4,
    right: 0,
  },
});

export default HomeScreen;

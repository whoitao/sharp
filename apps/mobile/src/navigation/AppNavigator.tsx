import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StudyRecord, StudyRecordSummary } from '@sharp/shared';
import React, { useEffect, useRef } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import ErrorBoundary from '../components/ErrorBoundary';
import GradientHeader from '../components/GradientHeader';
import GradientScreen from '../components/GradientScreen';
import { useDensity } from '../hooks/useDensity';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../i18n/useTranslation';
import type { RootState } from '../stores';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Home screens
import HomeScreen from '../screens/home/HomeScreen';

// Study screens
import QuizResultScreen from '../screens/study/QuizResultScreen';
import QuizScreen from '../screens/study/QuizScreen';
import StudyScreen from '../screens/study/StudyScreen';
// Textbook screens
import ChapterUnitsScreen from '../screens/textbook/ChapterUnitsScreen';
import TextbookScreen from '../screens/textbook/TextbookScreen';

// Profile screens
import type { SettingKey } from '../constants/settings';
import CrashLogScreen from '../screens/profile/CrashLogScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import RecordsScreen from '../screens/profile/RecordsScreen';
import SettingOptionScreen from '../screens/profile/SettingOptionScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import WrongQuestionsScreen from '../screens/profile/WrongQuestionsScreen';

// ─── Navigation param types ──────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

/** 答题页参数：考纲练习（categoryId）与教材章节练习（chapterId）二选一 */
export type QuizParams = {
  unitIndex: number;
  categoryId?: string;
  categoryName?: string;
  chapterId?: string;
  chapterName?: string;
  /** 教材面包屑（版本 · 年级 · 章节路径） */
  textbookLabel?: string;
  subjectId?: string;
  subjectName?: string;
  knowledgePointId?: string;
  knowledgePointName?: string;
  previousRecord?: StudyRecordSummary | null;
  /** 完成后「继续学习」返回到哪个页面，默认 Study */
  continueTo?: 'Study' | 'TextbookUnits';
};

export type QuizResultParams = {
  unitIndex: number;
  categoryId?: string;
  categoryName?: string;
  chapterId?: string;
  chapterName?: string;
  textbookLabel?: string;
  subjectId?: string;
  knowledgePointId?: string;
  record?: StudyRecord;
  continueTo?: 'Study' | 'TextbookUnits';
};

/** 教材章节列表 → 单元列表 */
export type TextbookUnitsParams = {
  chapterId: string;
  chapterName: string;
  /** 版本 · 年级 */
  textbookLabel?: string;
  /** 从章到当前节的路径，展示在单元列表顶部 */
  breadcrumb?: string;
  subjectId?: string;
};

export type HomeStackParamList = {
  Home: undefined;
  // 首页也注册一份错题本/学习记录/练习结果：从首页进入返回首页，从「我的」进入返回「我的」
  WrongQuestions: undefined;
  Records: undefined;
  QuizResult: QuizResultParams;
  // 教材同步（独立入口，不改动考纲学习流程）
  Textbook: undefined;
  TextbookUnits: TextbookUnitsParams;
  Quiz: QuizParams;
};

export type StudyStackParamList = {
  // subjectId：首页点学科行直达该学科（进页面后自动选中，随后由 StudyScreen 清掉参数）
  Study: { subjectId?: string } | undefined;
  // previousRecord：本单元上一次已完成的学习记录（有则答题页展示「上次学习」摘要）
  Quiz: QuizParams;
  QuizResult: QuizResultParams;
  Textbook: undefined;
  TextbookUnits: TextbookUnitsParams;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  SettingOption: { key: SettingKey };
  Records: undefined;
  WrongQuestions: undefined;
  CrashLog: undefined;
  // 从学习记录进入时：在 ProfileTab 内展示练习结果，不跨 Tab 切换，保持底部高亮在"我的"
  QuizResult: QuizResultParams;
};

export type MainTabParamList = {
  HomeTab: undefined;
  StudyTab: undefined;
  ProfileTab: undefined;
};

// ─ Navigators ───────────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const StudyStack = createNativeStackNavigator<StudyStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// 页面级渐变包装：所有主页面根容器背景已设为透明，由该包装组件铺满整页浅绿渐变（与头部渐变无缝衔接）
const withGradient = (Comp: React.ComponentType<any>): React.FC<any> => {
  const Wrapped: React.FC<any> = (props) => (
    <GradientScreen>
      <Comp {...props} />
    </GradientScreen>
  );
  Wrapped.displayName = `withGradient(${Comp.displayName || Comp.name || 'Screen'})`;
  return Wrapped;
};

// ─── Auth Navigator ───────────────────────────────────────────────────────────

const AuthNavigator: React.FC = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen as any} />
    <AuthStack.Screen name="Register" component={RegisterScreen as any} />
  </AuthStack.Navigator>
);

// 答题页标题：分类/章节 - 科目 - 知识点（未选的项自动省略）
const quizTitle = (params: QuizParams): string =>
  [
    params.categoryName ?? params.chapterName,
    params.subjectName,
    params.knowledgePointName,
  ]
    .filter(Boolean)
    .join(' - ');

// ── Home Stack Navigator ─────────────────────────────────────────────────────

const HomeStackNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <HomeStack.Navigator
      screenOptions={{
        headerBackground: () => <GradientHeader />,
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleAlign: 'center',
        headerTitleStyle: { fontWeight: '400' },
        headerBackButtonDisplayMode: 'minimal',
        animation: 'slide_from_right',
      }}
    >
    <HomeStack.Screen
      name="Home"
      component={withGradient(HomeScreen)}
      options={{ title: 'Sharp' }}
    />
    {/* 从首页快捷入口进入的错题本 / 学习记录，返回时回到首页 */}
    <HomeStack.Screen
      name="WrongQuestions"
      component={withGradient(WrongQuestionsScreen)}
      options={{ title: t.wrongQuestions }}
    />
    <HomeStack.Screen
      name="Records"
      component={withGradient(RecordsScreen)}
      options={{ title: t.studyRecords }}
    />
    {/* 从首页的学习记录点进练习结果，保持在首页 Tab 内 */}
    <HomeStack.Screen
      name="QuizResult"
      component={withGradient(QuizResultScreen)}
      options={{ title: t.quizResultTitle }}
    />
    {/* 教材同步：独立入口，不改动考纲学习流程 */}
    <HomeStack.Screen
      name="Textbook"
      component={withGradient(TextbookScreen)}
      options={{ title: t.textbookTitle }}
    />
    <HomeStack.Screen
      name="TextbookUnits"
      component={withGradient(ChapterUnitsScreen)}
      options={({ route }) => ({ title: route.params.chapterName })}
    />
    <HomeStack.Screen
      name="Quiz"
      component={withGradient(QuizScreen)}
      options={({ route }) => ({
        title: quizTitle(route.params),
        headerBackVisible: false,
        headerLeft: () => null,
      })}
    />
    </HomeStack.Navigator>
  );
};

// ── Study Stack Navigator ────────────────────────────────────────────────────

const StudyStackNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <StudyStack.Navigator
      screenOptions={{
        headerBackground: () => <GradientHeader />,
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleAlign: 'center',
        headerTitleStyle: { fontWeight: '400' },
        headerBackButtonDisplayMode: 'minimal',
        animation: 'slide_from_right',
      }}
    >
    <StudyStack.Screen
      name="Study"
      component={withGradient(StudyScreen)}
      options={{ title: t.study }}
    />
    <StudyStack.Screen
      name="Quiz"
      component={withGradient(QuizScreen)}
      options={({ route }) => ({
        title: quizTitle(route.params),
        headerBackVisible: false,
        headerLeft: () => null,
      })}
    />
    <StudyStack.Screen
      name="QuizResult"
      component={withGradient(QuizResultScreen)}
      options={{
        title: t.quizResultTitle,
      }}
    />
    {/* 教材同步：从学习页进入，保持在 StudyTab 内 */}
    <StudyStack.Screen
      name="Textbook"
      component={withGradient(TextbookScreen)}
      options={{ title: t.textbookTitle }}
    />
    <StudyStack.Screen
      name="TextbookUnits"
      component={withGradient(ChapterUnitsScreen)}
      options={({ route }) => ({ title: route.params.chapterName })}
    />
    </StudyStack.Navigator>
  );
};

// ─── Profile Stack Navigator ──────────────────────────────────────────────────

const ProfileStackNavigator: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerBackground: () => <GradientHeader />,
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleAlign: 'center',
        headerTitleStyle: { fontWeight: '400' },
        headerBackButtonDisplayMode: 'minimal',
        animation: 'slide_from_right',
      }}
    >
    <ProfileStack.Screen
      name="Profile"
      component={withGradient(ProfileScreen)}
      options={{ title: t.profile }}
    />
    <ProfileStack.Screen
      name="Settings"
      component={withGradient(SettingsScreen)}
      options={{ title: t.settings }}
    />
    <ProfileStack.Screen
      name="SettingOption"
      component={withGradient(SettingOptionScreen)}
      options={{ title: '' }}
    />
    <ProfileStack.Screen
      name="Records"
      component={withGradient(RecordsScreen)}
      options={{ title: t.studyRecords }}
    />
    <ProfileStack.Screen
      name="WrongQuestions"
      component={withGradient(WrongQuestionsScreen)}
      options={{ title: t.wrongQuestions }}
    />
    <ProfileStack.Screen
      name="CrashLog"
      component={withGradient(CrashLogScreen)}
      options={{ title: t.crashLogTitle }}
    />
    {/* 从学习记录跳转进来的练习结果，在 ProfileTab 内部展示 */}
    <ProfileStack.Screen
      name="QuizResult"
      component={withGradient(QuizResultScreen)}
      options={{ title: t.quizResultTitle }}
    />
    </ProfileStack.Navigator>
  );
};

// ─── Tab icon component ─────────────────────────────────────────────────────

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused }) => {
  const { colors } = useTheme();
  const { font } = useDensity();

  return (
    <Ionicons
      name={name}
      size={16 * font}
      color={focused ? colors.accent : colors.textTertiary}
    />
  );
};

// ─── Tab 级错误边界 ───────────────────────────────────────────────────────────

/** 单独包一层组件而不是内联 render，保证导航项的组件引用稳定 */
const withTabBoundary = (scope: string, Navigator: React.ComponentType): React.FC => {
  const TabScreen: React.FC = () => (
    <ErrorBoundary scope={scope}>
      <Navigator />
    </ErrorBoundary>
  );
  TabScreen.displayName = `${scope}Boundary`;
  return TabScreen;
};

const HomeTabScreen = withTabBoundary('HomeTab', HomeStackNavigator);
const StudyTabScreen = withTabBoundary('StudyTab', StudyStackNavigator);
const ProfileTabScreen = withTabBoundary('ProfileTab', ProfileStackNavigator);

// ─── Main Tab Navigator ───────────────────────────────────────────────────────

const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        // 选中态用 accentStrong：12px 标签需要 4.5:1，纯 accent 在白底只有 2.5:1
        tabBarActiveTintColor: colors.accentStrong,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          // 与页面渐变终点同色（都是 background），底部不会出现色调硬切
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          // 高度保持固定：随 spacing 缩放会导致 compact 下标签底部被裁切
          height: 64 + insets.bottom,
          paddingBottom: 4 + insets.bottom,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12 * font,
          fontWeight: '400',
          marginTop: 2 * spacing,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeTabScreen as any}
        options={{
          title: t.home,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="StudyTab"
        component={StudyTabScreen as any}
        options={{
          title: t.study,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'book' : 'book-outline'} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileTabScreen as any}
        options={{
          title: t.profile,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
};

// ─── Root Navigator ──────────────────────────────────────────────────────────

const RootStack = createNativeStackNavigator();

const AppNavigator: React.FC = () => {
  const auth = useSelector((state: RootState) => state.auth);
  const navigationRef = useNavigationContainerRef();
  const isAuthenticatedRef = useRef(auth.isAuthenticated);

  useEffect(() => {
    isAuthenticatedRef.current = auth.isAuthenticated;
  }, [auth.isAuthenticated]);

  // Android 物理返回键：首页根层时拦截，避免按一下就退出 App。
  // 非根层（如错题本/学习记录/练习页）仍遵循默认 pop 行为。
  useEffect(() => {
    const handler = () => {
      if (!isAuthenticatedRef.current) return false;
      const nav = navigationRef.current;
      if (!nav) return false;
      const state = nav.getRootState();
      if (!state) return false;

      // RootStack → Main tab navigator → 当前 active Tab → Tab 内 Stack → 当前 screen
      const mainTab = (state.routes[state.index] as any)?.state;
      if (!mainTab) return false;

      const activeTab = mainTab.routes[mainTab.index] as any;
      const activeStack = activeTab?.state;
      if (!activeStack) return false;

      // 只有 HomeTab 的 Home 是栈顶时才拦截，其他 Tab 的根层或子栈都放行
      const topScreen = activeStack.routes[activeStack.index]?.name;
      const isHomeRoot =
        activeTab.name === 'HomeTab' && topScreen === 'Home' && activeStack.index === 0;

      if (isHomeRoot) {
        // 保持在首页但给用户一个反馈（可选：toast）；这里直接返回 true 吃掉按键
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [navigationRef]);

  if (auth.isLoading) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {auth.isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainTabNavigator as any} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator as any} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({});

export default AppNavigator;

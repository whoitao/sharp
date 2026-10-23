import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StudyRecord } from '@sharp/shared';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import ErrorBoundary from '../components/ErrorBoundary';
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

// Profile screens
import CrashLogScreen from '../screens/profile/CrashLogScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import RecordsScreen from '../screens/profile/RecordsScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import WrongQuestionsScreen from '../screens/profile/WrongQuestionsScreen';

// ─── Navigation param types ──────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
};

export type StudyStackParamList = {
  Study: undefined;
  Quiz: { categoryId: string; unitIndex: number; categoryName: string };
  QuizResult: { categoryId: string; unitIndex: number; categoryName?: string; record?: StudyRecord };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  Records: undefined;
  WrongQuestions: undefined;
  CrashLog: undefined;
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

// ── Home Stack Navigator ─────────────────────────────────────────────────────

const HomeStackNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
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
      component={HomeScreen as any}
      options={{ title: 'Sharp' }}
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
        headerStyle: { backgroundColor: colors.background },
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
      component={StudyScreen as any}
      options={{ title: t.study }}
    />
    <StudyStack.Screen
      name="Quiz"
      component={QuizScreen as any}
      options={({ route }) => ({
        title: route.params.categoryName,
        headerBackVisible: false,
        headerLeft: () => null,
      })}
    />
    <StudyStack.Screen
      name="QuizResult"
      component={QuizResultScreen as any}
      options={{
        title: t.quizResultTitle,
      }}
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
        headerStyle: { backgroundColor: colors.background },
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
      component={ProfileScreen as any}
      options={{ title: t.profile }}
    />
    <ProfileStack.Screen
      name="Settings"
      component={SettingsScreen as any}
      options={{ title: t.settings }}
    />
    <ProfileStack.Screen
      name="Records"
      component={RecordsScreen as any}
      options={{ title: t.studyRecords }}
    />
    <ProfileStack.Screen
      name="WrongQuestions"
      component={WrongQuestionsScreen as any}
      options={{ title: t.wrongQuestions }}
    />
    <ProfileStack.Screen
      name="CrashLog"
      component={CrashLogScreen as any}
      options={{ title: t.crashLogTitle }}
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
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
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
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
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

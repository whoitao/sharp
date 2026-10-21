import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../i18n/useTranslation';
import type { RootState } from '../stores';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Home screens
import HomeScreen from '../screens/home/HomeScreen';

// Study screens
import QuizResultScreen from '../screens/home/QuizResultScreen';
import QuizScreen from '../screens/home/QuizScreen';
import StudyScreen from '../screens/study/StudyScreen';

// Profile screens
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
  QuizResult: { categoryId: string; unitIndex: number; categoryName: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
  Records: undefined;
  WrongQuestions: undefined;
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
      options={{ title: '学习' }}
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
        title: '练习结果',
      }}
    />
    </StudyStack.Navigator>
  );
};

// ─── Profile Stack Navigator ──────────────────────────────────────────────────

const ProfileStackNavigator: React.FC = () => {
  const { colors } = useTheme();

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
      options={{ title: '我的' }}
    />
    <ProfileStack.Screen
      name="Settings"
      component={SettingsScreen as any}
      options={{ title: '设置' }}
    />
    <ProfileStack.Screen
      name="Records"
      component={RecordsScreen as any}
      options={{ title: '学习记录' }}
    />
    <ProfileStack.Screen
      name="WrongQuestions"
      component={WrongQuestionsScreen as any}
      options={{ title: '错题本' }}
    />
    </ProfileStack.Navigator>
  );
};

// ─── Tab icon component ─────────────────────────────────────────────────────

interface TabIconProps {
  name: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused }) => {
  const { colors } = useTheme();

  return (
    <Ionicons
      name={name}
      size={16}
      color={focused ? colors.accent : colors.textTertiary}
    />
  );
};

// ─── Main Tab Navigator ───────────────────────────────────────────────────────

const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
          height: 64 + insets.bottom,
          paddingBottom: 4 + insets.bottom,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '400',
          marginTop: 2,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator as any}
        options={{
          title: t.home,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="StudyTab"
        component={StudyStackNavigator as any}
        options={{
          title: t.study,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'book' : 'book-outline'} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator as any}
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

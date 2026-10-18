import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { Category } from '@sharp/shared';
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
import CategoryScreen from '../screens/home/CategoryScreen';
import HomeScreen from '../screens/home/HomeScreen';
import QuizResultScreen from '../screens/home/QuizResultScreen';
import QuizScreen from '../screens/home/QuizScreen';
import UnitListScreen from '../screens/home/UnitListScreen';

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
  Category: { category: Category };
  UnitList: { category: Category };
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
  ProfileTab: undefined;
};

// ─ Navigators ───────────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
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
        headerTitleStyle: { fontWeight: '600' },
        headerBackButtonDisplayMode: 'minimal',
        animation: 'slide_from_right',
      }}
    >
    <HomeStack.Screen
      name="Home"
      component={HomeScreen as any}
      options={{ title: 'Sharp' }}
    />
    <HomeStack.Screen
      name="Category"
      component={CategoryScreen as any}
      options={({ route }) => ({
        title: route.params.category.name,
      })}
    />
    <HomeStack.Screen
      name="UnitList"
      component={UnitListScreen as any}
      options={({ route }) => ({
        title: route.params.category.name,
      })}
    />
    <HomeStack.Screen
      name="Quiz"
      component={QuizScreen as any}
      options={({ route }) => ({
        title: route.params.categoryName,
        headerBackVisible: false,
        headerLeft: () => null,
      })}
    />
    <HomeStack.Screen
      name="QuizResult"
      component={QuizResultScreen as any}
      options={{
        title: '练习结果',
      }}
    />
    </HomeStack.Navigator>
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
        headerTitleStyle: { fontWeight: '600' },
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
      size={24}
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
          position: 'absolute',
          backgroundColor: colors.surface,
          borderRadius: 24,
          marginHorizontal: 16,
          marginBottom: 16 + insets.bottom,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: colors.cardShadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarItemStyle: {
          flex: 1,
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

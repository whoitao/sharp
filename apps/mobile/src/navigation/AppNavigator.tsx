import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { Text } from 'react-native';
import type { Category } from '@sharp/shared';
import type { RootState } from '../stores';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Home screens
import HomeScreen from '../screens/home/HomeScreen';
import CategoryScreen from '../screens/home/CategoryScreen';
import UnitListScreen from '../screens/home/UnitListScreen';
import QuizScreen from '../screens/home/QuizScreen';
import QuizResultScreen from '../screens/home/QuizResultScreen';

// Profile screens
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import RecordsScreen from '../screens/profile/RecordsScreen';
import WrongQuestionsScreen from '../screens/profile/WrongQuestionsScreen';

// ─── Navigation param types ───────────────────────────────────────────────────

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

// ── Navigators ───────────────────────────────────────────────────────────────

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

const HomeStackNavigator: React.FC = () => (
  <HomeStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerShadowVisible: false,
      headerTintColor: '#1F2937',
      headerTitleStyle: { fontWeight: '600' },
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

// ─── Profile Stack Navigator ──────────────────────────────────────────────────

const ProfileStackNavigator: React.FC = () => (
  <ProfileStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: '#FFFFFF' },
      headerShadowVisible: false,
      headerTintColor: '#1F2937',
      headerTitleStyle: { fontWeight: '600' },
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

// ─── Tab icon component ───────────────────────────────────────────────────────

const TabIcon: React.FC<{ label: string; focused: boolean }> = ({ label, focused }) => (
  <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{label}</Text>
);

// ─── Main Tab Navigator ───────────────────────────────────────────────────────

const MainTabNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#3B82F6',
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopColor: '#E5E7EB',
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
      },
      headerShown: false,
    }}
  >
    <Tab.Screen
      name="HomeTab"
      component={HomeStackNavigator as any}
      options={{
        title: '学习',
        tabBarIcon: ({ focused }) => <TabIcon label="📚" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileStackNavigator as any}
      options={{
        title: '我的',
        tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} />,
      }}
    />
  </Tab.Navigator>
);

// ─── Root Navigator ───────────────────────────────────────────────────────────

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

export default AppNavigator;

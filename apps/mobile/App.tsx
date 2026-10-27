import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useTheme } from './src/hooks/useTheme';
import AppNavigator from './src/navigation/AppNavigator';
import { AppDispatch, RootState, store } from './src/stores';
import { initializeAuth } from './src/stores/authSlice';
import { loadSettings } from './src/stores/settingsSlice';
import { resetStudy } from './src/stores/studySlice';
import { installConsoleFilters } from './src/utils/consoleFilters';
import { installGlobalErrorLog } from './src/utils/globalErrorLog';

installGlobalErrorLog();
installConsoleFilters();

// 与安卓原生 splash 保持一致：绿色背景 + 居中 S 图标
const SPLASH_BACKGROUND = '#10B981';

const AppContent: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading: authLoading, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { initialized: settingsInitialized } = useSelector((state: RootState) => state.settings);
  const { colors } = useTheme();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  // 认证就绪后立即加载设置（密度/语言/主题），保证进入应用即生效
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      dispatch(loadSettings());
    }
  }, [dispatch, authLoading, isAuthenticated]);

  // 仅冷启动首次拉取设置前停在启动页；之后的刷新不再卸载重建整棵导航树
  if (authLoading || (isAuthenticated && !settingsInitialized)) {
    return (
      <View style={styles.splash}>
        <Image source={require('./assets/splash.png')} style={styles.splashImage} resizeMode="contain" />
      </View>
    );
  }

  return (
    <>
      {/* 已登录后所有页面均为渐变头部（深蓝底），状态栏图标用白色；
          登录/注册页无头部、浅色背景，跟随主题 */}
      <StatusBar style={isAuthenticated ? 'light' : colors.statusBar === 'light-content' ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ErrorBoundary scope="App" onRetry={() => store.dispatch(resetStudy())}>
        <AppContent />
      </ErrorBoundary>
    </Provider>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SPLASH_BACKGROUND,
  },
  splashImage: {
    width: 200,
    height: 200,
  },
});

export default App;

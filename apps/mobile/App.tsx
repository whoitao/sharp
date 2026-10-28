import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Appearance, Easing, Image, StyleSheet, View } from 'react-native';
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
  const theme = useSelector((state: RootState) => state.settings.theme);
  const { colors } = useTheme();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  // 原生控件（键盘、Alert、系统弹层）跟随应用内主题；system 时交还给系统外观
  // react-native-web 未实现 setColorScheme，Web 端直接跳过
  useEffect(() => {
    Appearance.setColorScheme?.(theme === 'system' ? 'unspecified' : (theme as 'light' | 'dark'));
  }, [theme]);

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
      <StatusBar style={colors.statusBar === 'light-content' ? 'light' : 'dark'} />
      <ThemeFade>
        <AppNavigator />
      </ThemeFade>
    </>
  );
};

// 主题切换时铺一层"旧底色"再淡出，避免整屏颜色在下一帧硬跳
const ThemeFade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const previousBackground = useRef(colors.background);
  const [veil, setVeil] = useState<string | null>(null);

  useEffect(() => {
    const previous = previousBackground.current;
    if (previous === colors.background) return;

    previousBackground.current = colors.background;
    setVeil(previous);
    opacity.setValue(1);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setVeil(null);
    });
  }, [colors.background, opacity]);

  return (
    <View style={styles.fill}>
      {children}
      {veil ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: veil, opacity }]}
        />
      ) : null}
    </View>
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
  fill: {
    flex: 1,
  },
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

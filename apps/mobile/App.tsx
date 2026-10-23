import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { useTheme } from './src/hooks/useTheme';
import AppNavigator from './src/navigation/AppNavigator';
import { AppDispatch, RootState, store } from './src/stores';
import { initializeAuth } from './src/stores/authSlice';
import { loadSettings } from './src/stores/settingsSlice';

// 与安卓原生 splash 保持一致：绿色背景 + 居中 S 图标
const SPLASH_BACKGROUND = '#10B981';

const AppContent: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading: authLoading, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isLoading: settingsLoading } = useSelector((state: RootState) => state.settings);
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

  if (authLoading || settingsLoading) {
    return (
      <View style={styles.splash}>
        <Image source={require('./assets/splash.png')} style={styles.splashImage} resizeMode="contain" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colors.statusBar === 'light-content' ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
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

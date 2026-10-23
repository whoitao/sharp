import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { useTheme } from './src/hooks/useTheme';
import AppNavigator from './src/navigation/AppNavigator';
import { AppDispatch, RootState, store } from './src/stores';
import { initializeAuth } from './src/stores/authSlice';
import { loadSettings } from './src/stores/settingsSlice';

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
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
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
    backgroundColor: '#F9FAFB',
  },
});

export default App;

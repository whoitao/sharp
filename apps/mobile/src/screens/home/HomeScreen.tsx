import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import BannerCarousel from '../../components/BannerCarousel';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: NavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { spacing } = useDensity();

  // 进入首页后的空余时间预拉取学习页搜索数据（分类/科目），
  // api 内部做缓存优先 + 并发去重，与学习页同时挂载也不会产生重复请求
  // 知识点按学科过滤，改为选中学科后再拉取，这里不预取
  useEffect(() => {
    api.getCategories('0').catch(() => {});
    api.getSubjects().catch(() => {});
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: 'transparent', paddingHorizontal: 12 * spacing }]}>
      <BannerCarousel />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
  },
});

export default HomeScreen;

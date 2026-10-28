import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SubjectOverview } from '@sharp/shared';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BannerCarousel from '../../components/BannerCarousel';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function isIoniconName(value?: string | null): value is IoniconName {
  return !!value && value in Ionicons.glyphMap;
}

const SubjectRow: React.FC<{ item: SubjectOverview }> = ({ item }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.subjectRow,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: 12 * radius,
          padding: 12 * spacing,
          marginTop: 8 * spacing,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.accentLight, borderRadius: 10 * radius },
        ]}
      >
        <Ionicons
          name={isIoniconName(item.icon) ? item.icon : 'school-outline'}
          size={20 * font}
          color={colors.accentStrong}
        />
      </View>
      <View style={styles.subjectBody}>
        <View style={styles.subjectHeader}>
          <Text
            style={[styles.subjectName, { color: colors.text, fontSize: 16 * font }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text style={[styles.subjectPercent, { color: colors.accentStrong, fontSize: 14 * font }]}>
            {item.progress}%
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.accent,
                width: `${item.progress}%` as `${number}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.subjectMeta, { color: colors.textTertiary, fontSize: 12 * font }]}>
          {t.subjectQuestionCount(item.questionCount)} · {t.subjectProgressLabel(item.progress)}
        </Text>
      </View>
    </View>
  );
};

interface HomeScreenProps {
  navigation: NavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();
  const [subjects, setSubjects] = useState<SubjectOverview[]>([]);
  const [loading, setLoading] = useState(true);

  // 进入首页后的空余时间预拉取学习页搜索数据（分类/科目），
  // api 内部做缓存优先 + 并发去重，与学习页同时挂载也不会产生重复请求
  // 知识点按学科过滤，改为选中学科后再拉取，这里不预取
  useEffect(() => {
    api.getCategories('0').catch(() => {});
    api.getSubjects().catch(() => {});
  }, []);

  const loadSubjects = useCallback(async () => {
    const data = await api.getSubjectOverview();
    setSubjects(data);
    setLoading(false);
  }, []);

  // 每次回到首页都刷新：从练习页返回时已学比例要跟着变
  useFocusEffect(
    useCallback(() => {
      loadSubjects().catch(() => setLoading(false));
    }, [loadSubjects])
  );

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <ScrollView
        contentContainerStyle={{ padding: 12 * spacing, paddingBottom: 24 * spacing }}
        showsVerticalScrollIndicator={false}
      >
        <BannerCarousel />
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, fontSize: 16 * font, marginTop: 20 * spacing },
          ]}
        >
          {t.homeSubjects}
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
        ) : subjects.length === 0 ? (
          <Text style={{ color: colors.textSecondary, fontSize: 14 * font, marginTop: 8 }}>
            {t.noData}
          </Text>
        ) : (
          subjects.map((subject) => <SubjectRow key={subject.id} item={subject} />)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subjectBody: {
    flex: 1,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectName: {
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  subjectPercent: {
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    marginTop: 8,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  subjectMeta: {
    marginTop: 6,
  },
});

export default HomeScreen;

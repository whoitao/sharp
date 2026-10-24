import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { StudyRecord } from '@sharp/shared';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Records'>;

interface RecordsScreenProps {
  navigation: NavigationProp;
}

const RecordsScreen: React.FC<RecordsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRecords = useCallback(async (pageNum: number = 1) => {
    try {
      setLoading(pageNum === 1);
      const response = await api.getStudyRecords(pageNum, 20);
      if (pageNum === 1) {
        setRecords(response.data);
      } else {
        setRecords((prev) => [...prev, ...response.data]);
      }
      setTotalPages(response.totalPages);
      setPage(pageNum);
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords(1);
  }, [fetchRecords]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecords(1);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loading) {
      fetchRecords(page + 1);
    }
  };

  const handleRecordPress = (record: StudyRecord) => {
    (navigation as any).navigate('StudyTab', {
      screen: 'QuizResult',
      params: {
        categoryId: record.categoryId,
        unitIndex: record.unitIndex,
        record,
      },
    });
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${t.monthDay(month, day)} ${t.clockTime(hours, minutes)}`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}${t.minuteShort}${secs}${t.secondShort}`;
    return `${secs}${t.secondShort}`;
  };

  const renderItem = ({ item }: { item: StudyRecord }) => {
    const percentage =
      item.totalQuestions > 0
        ? Math.round((item.correctCount / item.totalQuestions) * 100)
        : 0;

    return (
      <TouchableOpacity
        style={[styles.recordCard, { backgroundColor: colors.surface, padding: 16 * spacing, borderRadius: 12 * radius, marginBottom: 10 * spacing }]}
        onPress={() => handleRecordPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.recordHeader, { marginBottom: 14 * spacing }]}>
          <Text style={[styles.recordDate, { color: colors.textSecondary, fontSize: 14 * font }]}>{formatDate(item.startedAt)}</Text>
          <View
            style={[
              styles.scoreBadge,
              {
                backgroundColor:
                  percentage >= 80 ? colors.accentLight : percentage >= 60 ? '#FEF3C7' : colors.errorLight,
                paddingHorizontal: 10 * spacing,
                paddingVertical: 4 * spacing,
                borderRadius: 12 * radius,
              },
            ]}
          >
            <Text
              style={[
                styles.scoreBadgeText,
                {
                  fontSize: 13 * font,
                  color:
                    percentage >= 80 ? colors.accent : percentage >= 60 ? '#D97706' : colors.error,
                },
              ]}
            >
              {percentage}%
            </Text>
          </View>
        </View>
        <View style={styles.recordBody}>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 12 * font, marginBottom: 4 * spacing }]}>{t.statQuestions}</Text>
            <Text style={[styles.recordStatValue, { color: colors.text, fontSize: 16 * font }]}>{item.totalQuestions}</Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 12 * font, marginBottom: 4 * spacing }]}>{t.statCorrect}</Text>
            <Text style={[styles.recordStatValue, { color: colors.accent, fontSize: 16 * font }]}>
              {item.correctCount}
            </Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 12 * font, marginBottom: 4 * spacing }]}>{t.statWrong}</Text>
            <Text style={[styles.recordStatValue, { color: colors.error, fontSize: 16 * font }]}>
              {item.wrongCount}
            </Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={[styles.recordStatLabel, { color: colors.textTertiary, fontSize: 12 * font, marginBottom: 4 * spacing }]}>{t.statDuration}</Text>
            <Text style={[styles.recordStatValue, { color: colors.text, fontSize: 16 * font }]}>{formatDuration(item.durationSeconds)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && records.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { padding: 16 * spacing, paddingTop: 0, paddingBottom: 24 * spacing }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
            <Text style={[styles.emptyIcon, { fontSize: 48 * font, marginBottom: 12 * spacing }]}>📊</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 16 * font, marginBottom: 4 * spacing }]}>{t.recordsEmpty}</Text>
            <Text style={[styles.emptySub, { color: colors.textTertiary, fontSize: 14 * font }]}>{t.recordsEmptySub}</Text>
          </View>
        }
        ListFooterComponent={
          loading && records.length > 0 ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
  recordCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  recordBody: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  recordStat: {
    alignItems: 'center',
  },
  recordStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  recordStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 14,
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default RecordsScreen;

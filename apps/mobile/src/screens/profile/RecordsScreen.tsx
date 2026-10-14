import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { api } from '../../services/api';
import type { StudyRecord } from '@sharp/shared';

const RecordsScreen: React.FC = () => {
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

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}分${secs}秒`;
    return `${secs}秒`;
  };

  const renderItem = ({ item }: { item: StudyRecord }) => {
    const percentage =
      item.totalQuestions > 0
        ? Math.round((item.correctCount / item.totalQuestions) * 100)
        : 0;

    return (
      <View style={styles.recordCard}>
        <View style={styles.recordHeader}>
          <Text style={styles.recordDate}>{formatDate(item.startedAt)}</Text>
          <View
            style={[
              styles.scoreBadge,
              {
                backgroundColor:
                  percentage >= 80 ? '#D1FAE5' : percentage >= 60 ? '#FEF3C7' : '#FEE2E2',
              },
            ]}
          >
            <Text
              style={[
                styles.scoreBadgeText,
                {
                  color:
                    percentage >= 80 ? '#059669' : percentage >= 60 ? '#D97706' : '#DC2626',
                },
              ]}
            >
              {percentage}%
            </Text>
          </View>
        </View>
        <View style={styles.recordBody}>
          <View style={styles.recordStat}>
            <Text style={styles.recordStatLabel}>题目</Text>
            <Text style={styles.recordStatValue}>{item.totalQuestions}</Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={styles.recordStatLabel}>正确</Text>
            <Text style={[styles.recordStatValue, { color: '#059669' }]}>
              {item.correctCount}
            </Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={styles.recordStatLabel}>错误</Text>
            <Text style={[styles.recordStatValue, { color: '#DC2626' }]}>
              {item.wrongCount}
            </Text>
          </View>
          <View style={styles.recordStat}>
            <Text style={styles.recordStatLabel}>用时</Text>
            <Text style={styles.recordStatValue}>{formatDuration(item.durationSeconds)}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && records.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>学习记录</Text>
            <Text style={styles.subtitle}>查看你的学习历史</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>暂无学习记录</Text>
            <Text style={styles.emptySub}>开始学习后记录将显示在这里</Text>
          </View>
        }
        ListFooterComponent={
          loading && records.length > 0 ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#3B82F6" />
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
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
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
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
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
    color: '#6B7280',
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
    color: '#9CA3AF',
    marginBottom: 4,
  },
  recordStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
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
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default RecordsScreen;

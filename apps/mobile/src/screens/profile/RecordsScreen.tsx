import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Category, KnowledgePoint, StudyRecord, Subject } from '@sharp/shared';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import TreePickerModal from '../../components/TreePickerModal';
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

  // 顶部筛选：分类 / 科目 / 知识点（均可不选 = 全部）
  const [categories, setCategories] = useState<Category[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedKP, setSelectedKP] = useState<KnowledgePoint | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [kpModalVisible, setKpModalVisible] = useState(false);

  const fetchRecords = useCallback(async (pageNum: number = 1) => {
    try {
      setLoading(pageNum === 1);
      const response = await api.getStudyRecords(
        pageNum,
        20,
        selectedCategory?.id,
        selectedSubject?.id,
        selectedKP?.id,
      );
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
  }, [selectedCategory, selectedSubject, selectedKP]);

  // 下拉数据源：与学习页同一套接口
  useEffect(() => {
    (async () => {
      try {
        const [cats, subs, kps] = await Promise.all([
          api.getCategories('0'),
          api.getSubjects(),
          api.getKnowledgePoints(),
        ]);
        setCategories(cats);
        setSubjects(subs);
        setKnowledgePoints(kps);
      } catch {
        // ignore
      }
    })();
  }, []);

  // 筛选变化时回到第一页重新加载
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
        subjectId: record.subjectId ?? undefined,
        knowledgePointId: record.knowledgePointId ?? undefined,
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

  const renderFilterChip = (
    label: string | null,
    placeholder: string,
    onPress: () => void,
    onClear: (() => void) | null,
  ) => (
    <TouchableOpacity
      style={[styles.dropdownButton, { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 10 * spacing, paddingHorizontal: 12 * spacing, borderRadius: 8 * radius }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[styles.dropdownButtonText, { color: label ? colors.text : colors.textTertiary, fontSize: 13 * font }]}
        numberOfLines={1}
      >
        {label ?? placeholder}
      </Text>
      {label && onClear && (
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ color: colors.textTertiary, fontSize: 13 * font, marginLeft: 4 * spacing }}>✕</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 顶部筛选：分类 / 科目 / 知识点 */}
      <View style={[styles.dropdownsContainer, { padding: 12 * spacing, paddingTop: 12 * spacing, gap: 8 * spacing }]}>
        {renderFilterChip(
          selectedCategory?.name ?? null,
          t.studySelectCategory,
          () => setCategoryModalVisible(true),
          () => setSelectedCategory(null),
        )}
        {renderFilterChip(
          selectedSubject?.name ?? null,
          t.studySelectSubject,
          () => setSubjectModalVisible(true),
          () => setSelectedSubject(null),
        )}
        {renderFilterChip(
          selectedKP?.name ?? null,
          t.studySelectKnowledgePoint,
          () => setKpModalVisible(true),
          () => setSelectedKP(null),
        )}
      </View>

      {loading && records.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
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
      )}

      <TreePickerModal<Category>
        visible={categoryModalVisible}
        title={t.studySelectCategory}
        roots={categories}
        selectedId={selectedCategory?.id ?? null}
        colors={colors}
        emptyText={t.noData}
        onClose={() => setCategoryModalVisible(false)}
        onSelect={(node) => {
          setSelectedCategory(node);
          setCategoryModalVisible(false);
        }}
        loadChildren={(node) => api.getCategories(node.id)}
      />

      <Modal visible={subjectModalVisible} transparent animationType="fade" onRequestClose={() => setSubjectModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSubjectModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 * font }]}>{t.studySelectSubject}</Text>
            <ScrollView style={styles.modalList}>
              {subjects.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={[styles.modalOption, { borderRadius: 8 * radius }, selectedSubject?.id === sub.id && { backgroundColor: colors.accentLight }]}
                  onPress={() => {
                    setSelectedSubject(sub);
                    setSubjectModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text, fontSize: 16 * font }]}>{sub.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <TreePickerModal<KnowledgePoint>
        visible={kpModalVisible}
        title={t.studySelectKnowledgePoint}
        roots={knowledgePoints}
        selectedId={selectedKP?.id ?? null}
        colors={colors}
        emptyText={t.noData}
        onClose={() => setKpModalVisible(false)}
        onSelect={(node) => {
          setSelectedKP(node);
          setKpModalVisible(false);
        }}
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
  dropdownsContainer: { flexDirection: 'row', padding: 12, gap: 8 },
  dropdownButton: { flex: 1, flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dropdownButtonText: { fontSize: 13, fontWeight: '500' },
  list: {
    padding: 16,
    paddingBottom: 24,
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '60%', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  modalList: { maxHeight: 300 },
  modalOption: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 4 },
  modalOptionText: { fontSize: 16, textAlign: 'center' },
});

export default RecordsScreen;

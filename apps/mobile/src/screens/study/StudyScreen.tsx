import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Category, KnowledgePoint, Subject, UnitInfo } from '@sharp/shared';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import TreePickerModal from '../../components/TreePickerModal';
import UnitItem from '../../components/UnitItem';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { StudyStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { fetchQuestions } from '../../stores/studySlice';
import { clearStudyCache, hasStudyCache } from '../../utils/studyCache';

type NavigationProp = NativeStackNavigationProp<StudyStackParamList, 'Study'>;

interface StudyScreenProps {
  navigation: NavigationProp;
}

interface DropdownOption {
  value: string;
  label: string;
}

// 服务端 pageSize 上限是 100，超过部分必须翻页取回，否则单元列表会被静默截断
const UNITS_PAGE_SIZE = 100;
const UNITS_MAX_PAGES = 20;

const keyExtractor = (item: UnitInfo) => item.unitIndex.toString();

const StudyScreen: React.FC<StudyScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { unitSize } = useSelector((state: RootState) => state.settings);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedKP, setSelectedKP] = useState<KnowledgePoint | null>(null);

  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataRefreshing, setDataRefreshing] = useState(false);
  const [pressingUnitIndex, setPressingUnitIndex] = useState<number | null>(null);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [kpModalVisible, setKpModalVisible] = useState(false);

  const fetchInitialData = useCallback(async () => {
    // 仅在无有效缓存时显示 loading，缓存命中则静默刷新
    const cached = await hasStudyCache();
    if (!cached) setInitialLoading(true);
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
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // 手动强制刷新：清空缓存后重新拉取分类/科目/知识点
  const handleRefresh = useCallback(async () => {
    if (dataRefreshing) return;
    setDataRefreshing(true);
    try {
      await clearStudyCache();
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
    } finally {
      setDataRefreshing(false);
    }
  }, [dataRefreshing]);

  // 一次性加载全部单元（不做触底分页），但需按服务端 pageSize 上限翻页取满
  const fetchUnits = useCallback(async () => {
    if (!selectedCategory || !selectedSubject || !selectedKP) {
      setUnits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const collected: UnitInfo[] = [];
      for (let page = 1; page <= UNITS_MAX_PAGES; page += 1) {
        const { units, totalUnits } = await api.getUnits(
          selectedCategory.id,
          selectedSubject.id,
          selectedKP.id,
          page,
          UNITS_PAGE_SIZE,
        );
        collected.push(...units);
        if (units.length === 0 || collected.length >= totalUnits) break;
      }
      setUnits(collected);
    } catch {
      setUnits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedSubject, selectedKP]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUnits();
  }, [fetchUnits]);

  const handleUnitPress = useCallback(
    async (unit: UnitInfo) => {
      if (pressingUnitIndex !== null || !selectedCategory) return;
      setPressingUnitIndex(unit.unitIndex);
      try {
        try {
          await api.startStudy(selectedCategory.id, unit.unitIndex);
        } catch {
          // silently proceed
        }
        const result = await dispatch(
          fetchQuestions({
            categoryId: selectedCategory.id,
            unitIndex: unit.unitIndex,
            subjectId: selectedSubject?.id,
            knowledgePointId: selectedKP?.id,
          })
        );
        if (fetchQuestions.fulfilled.match(result)) {
          navigation.navigate('Quiz', {
            categoryId: selectedCategory.id,
            unitIndex: unit.unitIndex,
            categoryName: selectedCategory.name,
          });
        }
      } finally {
        setPressingUnitIndex(null);
      }
    },
    [pressingUnitIndex, selectedCategory, selectedSubject, selectedKP, dispatch, navigation]
  );

  const subjectOptions: DropdownOption[] = subjects.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const loadCategoryChildren = useCallback(
    (node: Category) => api.getCategories(node.id),
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: UnitInfo }) => (
      <UnitItem
        unit={item}
        onPress={handleUnitPress}
        loading={pressingUnitIndex === item.unitIndex}
        disabled={pressingUnitIndex !== null}
      />
    ),
    [handleUnitPress, pressingUnitIndex]
  );

  const contentContainerStyle = useMemo(
    () => [styles.list, { padding: 16 * spacing, paddingTop: 8 * spacing, paddingBottom: 24 * spacing }],
    [spacing]
  );

  const listEmptyComponent = useMemo(
    () => (
      <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
        <Text style={[styles.emptyIcon, { fontSize: 48 * font, marginBottom: 12 * spacing }]}>📋</Text>
        <Text style={[styles.emptyText, { color: colors.textTertiary, fontSize: 16 * font }]}>
          {selectedCategory && selectedSubject && selectedKP ? t.studyNoUnits : t.studySelectAllFilters}
        </Text>
      </View>
    ),
    [spacing, font, colors.textTertiary, selectedCategory, selectedSubject, selectedKP, t.studyNoUnits, t.studySelectAllFilters]
  );

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />,
    [refreshing, onRefresh, colors.accent]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.dropdownsContainer, { padding: 12 * spacing, gap: 8 * spacing }]}>
        <DropdownButton
          label={selectedCategory?.name || t.studySelectCategory}
          placeholder={!selectedCategory}
          onPress={() => setCategoryModalVisible(true)}
          colors={colors}
          spacing={spacing}
          font={font}
          radius={radius}
        />
        <DropdownButton
          label={selectedSubject?.name || t.studySelectSubject}
          placeholder={!selectedSubject}
          onPress={() => setSubjectModalVisible(true)}
          colors={colors}
          spacing={spacing}
          font={font}
          radius={radius}
        />
        <DropdownButton
          label={selectedKP?.name || t.studySelectKnowledgePoint}
          placeholder={!selectedKP}
          onPress={() => setKpModalVisible(true)}
          colors={colors}
          spacing={spacing}
          font={font}
          radius={radius}
        />
        <TouchableOpacity
          style={[
            styles.refreshBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 8 * radius,
              width: 40 * spacing + 8,
            },
          ]}
          onPress={handleRefresh}
          disabled={dataRefreshing}
          activeOpacity={0.6}
        >
          {dataRefreshing ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="refresh" size={18 * font} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
        {initialLoading && (
          <View style={[styles.initialLoadingOverlay, { borderRadius: 8 * radius }]}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.initialLoadingText, { fontSize: 13 * font, color: colors.textSecondary }]}>
              {t.loading}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={units}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={contentContainerStyle}
          refreshControl={refreshControl}
          ListEmptyComponent={listEmptyComponent}
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
        loadChildren={loadCategoryChildren}
      />

      <Modal visible={subjectModalVisible} transparent animationType="fade" onRequestClose={() => setSubjectModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSubjectModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.studySelectSubject}</Text>
            <ScrollView style={styles.modalList}>
              {subjectOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.modalOption, selectedSubject?.id === option.value && { backgroundColor: colors.accentLight }]}
                  onPress={() => {
                    const sub = subjects.find((s) => s.id === option.value);
                    setSelectedSubject(sub || null);
                    setSubjectModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>{option.label}</Text>
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

interface DropdownButtonProps {
  label: string;
  placeholder?: boolean;
  onPress: () => void;
  colors: any;
  spacing: number;
  font: number;
  radius: number;
}

const DropdownButton: React.FC<DropdownButtonProps> = ({ label, placeholder = false, onPress, colors, spacing, font, radius }) => {
  const text = label ?? '';
  return (
    <TouchableOpacity style={[styles.dropdownButton, { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 10 * spacing, paddingHorizontal: 12 * spacing, borderRadius: 8 * radius }]} onPress={onPress}>
      <Text style={[styles.dropdownButtonText, { color: placeholder ? colors.textTertiary : colors.text, fontSize: 13 * font }]} numberOfLines={1}>
        {text}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  dropdownsContainer: { flexDirection: 'row', padding: 12, paddingTop: 0, gap: 8, position: 'relative' },
  initialLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  initialLoadingText: { fontSize: 13 },
  dropdownButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  refreshBtn: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  dropdownButtonText: { fontSize: 13, fontWeight: '500' },
  list: { padding: 16, paddingTop: 8, paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '60%', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  modalList: { maxHeight: 300 },
  modalOption: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 4 },
  modalOptionText: { fontSize: 16, textAlign: 'center' },
});

export default StudyScreen;

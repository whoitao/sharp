import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Category, KnowledgePoint, Subject, UnitInfo } from '@sharp/shared';
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
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import UnitItem from '../../components/UnitItem';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { StudyStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { fetchQuestions } from '../../stores/studySlice';

type NavigationProp = NativeStackNavigationProp<StudyStackParamList, 'Study'>;

interface StudyScreenProps {
  navigation: NavigationProp;
}

interface DropdownOption {
  value: string;
  label: string;
}

const StudyScreen: React.FC<StudyScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
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
  const [refreshing, setRefreshing] = useState(false);
  const [pressingUnitIndex, setPressingUnitIndex] = useState<number | null>(null);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [kpModalVisible, setKpModalVisible] = useState(false);

  const fetchInitialData = useCallback(async () => {
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
  }, []);

  const fetchUnits = useCallback(async () => {
    if (!selectedCategory) {
      setUnits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getUnits(selectedCategory.id);
      setUnits(data);
    } catch {
      setUnits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUnits();
  };

  const handleUnitPress = async (unit: UnitInfo) => {
    if (pressingUnitIndex !== null || !selectedCategory) return;
    setPressingUnitIndex(unit.unitIndex);
    try {
      try {
        await api.startStudy(selectedCategory.id, unit.unitIndex);
      } catch {
        // silently proceed
      }
      const result = await dispatch(
        fetchQuestions({ categoryId: selectedCategory.id, unitIndex: unit.unitIndex })
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
  };

  const categoryOptions: DropdownOption[] = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const subjectOptions: DropdownOption[] = subjects.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const kpOptions: DropdownOption[] = knowledgePoints.map((kp) => ({
    value: kp.id,
    label: kp.name,
  }));

  const renderItem = ({ item }: { item: UnitInfo }) => (
    <UnitItem
      unit={item}
      onPress={() => handleUnitPress(item)}
      loading={pressingUnitIndex === item.unitIndex}
      disabled={pressingUnitIndex !== null}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.dropdownsContainer}>
        <DropdownButton
          label={selectedCategory?.name || t.studySelectCategory}
          onPress={() => setCategoryModalVisible(true)}
          colors={colors}
        />
        <DropdownButton
          label={selectedSubject?.name || t.studySelectSubject}
          onPress={() => setSubjectModalVisible(true)}
          colors={colors}
        />
        <DropdownButton
          label={selectedKP?.name || t.studySelectKnowledgePoint}
          onPress={() => setKpModalVisible(true)}
          colors={colors}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={units}
          keyExtractor={(item) => item.unitIndex.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {selectedCategory ? t.studyNoUnits : t.studySelectCategoryFirst}
              </Text>
            </View>
          }
        />
      )}

      <Modal visible={categoryModalVisible} transparent animationType="fade" onRequestClose={() => setCategoryModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCategoryModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.studySelectCategory}</Text>
            <ScrollView style={styles.modalList}>
              {categoryOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.modalOption, selectedCategory?.id === option.value && { backgroundColor: colors.accentLight }]}
                  onPress={() => {
                    const cat = categories.find((c) => c.id === option.value);
                    setSelectedCategory(cat || null);
                    setCategoryModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

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

      <Modal visible={kpModalVisible} transparent animationType="fade" onRequestClose={() => setKpModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setKpModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.studySelectKnowledgePoint}</Text>
            <ScrollView style={styles.modalList}>
              {kpOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.modalOption, selectedKP?.id === option.value && { backgroundColor: colors.accentLight }]}
                  onPress={() => {
                    const kp = knowledgePoints.find((k) => k.id === option.value);
                    setSelectedKP(kp || null);
                    setKpModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

interface DropdownButtonProps {
  label: string;
  onPress: () => void;
  colors: any;
}

const DropdownButton: React.FC<DropdownButtonProps> = ({ label, onPress, colors }) => {
  const text = label ?? '';
  return (
    <TouchableOpacity style={[styles.dropdownButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onPress}>
      <Text style={[styles.dropdownButtonText, { color: text.includes('选择') ? colors.textTertiary : colors.text }]} numberOfLines={1}>
        {text}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  dropdownsContainer: { flexDirection: 'row', padding: 12, paddingTop: 0, gap: 8 },
  dropdownButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
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

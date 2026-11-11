import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Grade, Subject, Textbook, TextbookCatalog } from '@sharp/shared';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScopeSelectorHeader from '../../components/ScopeSelectorHeader';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import { api } from '../../services/api';
import type { AppDispatch, RootState } from '../../stores';
import { setTextbookId, updateSettings } from '../../stores/settingsSlice';

type NavigationProp = NativeStackNavigationProp<{ Textbook: undefined }, 'Textbook'>;

interface TextbookScreenProps {
  navigation: NavigationProp;
}

const TextbookScreen: React.FC<TextbookScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { gradeId, subjectId, textbookId: savedTextbookId } = useSelector(
    (state: RootState) => state.settings,
  );

  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<TextbookCatalog | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | null>(null);

  // 首屏：教材目录 + 选择器所需的年级/科目字典
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, gradeList, subjectList] = await Promise.all([
          api.getTextbookCatalog(),
          api.getGrades(),
          api.getSubjects(),
        ]);
        if (cancelled) return;
        setCatalog(data);
        setGrades(gradeList);
        setSubjects(subjectList);
      } catch {
        if (!cancelled) setCatalog(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // 仅首屏拉取，页面内的选择变化由 Redux 驱动
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 右上角「年级 + 科目」选择器：选中项来自全局设置
  const selectedGrade = useMemo(
    () => grades.find((grade) => grade.id === gradeId) ?? null,
    [grades, gradeId],
  );
  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === subjectId) ?? null,
    [subjects, subjectId],
  );

  const allTextbooks = useMemo(
    () => catalog?.stages.flatMap((stage) => stage.subjects.flatMap((subject) => subject.textbooks)) ?? [],
    [catalog],
  );

  // 按「年级 + 科目」过滤要展示的教材（版本即过滤后的教材列表）；未选全时不出教材
  const visibleTextbooks = useMemo(() => {
    if (!selectedGrade || !selectedSubject) return [];
    return allTextbooks.filter(
      (textbook) =>
        textbook.gradeId === selectedGrade.id && textbook.subjectId === selectedSubject.id,
    );
  }, [allTextbooks, selectedGrade, selectedSubject]);

  // 只有用户真正选过（savedTextbookId 落在当前筛选结果里）才展示选中态；
  // 没选过、或已选教材不在当前筛选结果里时一律不高亮，避免"默认选中第一本"的假选中
  useEffect(() => {
    if (visibleTextbooks.some((textbook) => textbook.id === selectedTextbookId)) return;
    const saved = visibleTextbooks.find((textbook) => textbook.id === savedTextbookId);
    setSelectedTextbookId(saved?.id ?? null);
  }, [visibleTextbooks, savedTextbookId, selectedTextbookId]);

  const handleChangeGrade = useCallback(
    (grade: Grade | null) => {
      dispatch(updateSettings({ gradeId: grade?.id ?? null }));
    },
    [dispatch],
  );

  const handleChangeSubject = useCallback(
    (subject: Subject | null) => {
      dispatch(updateSettings({ subjectId: subject?.id ?? null }));
    },
    [dispatch],
  );

  // 「年级 + 科目」选择器居中显示在原生 header
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <ScopeSelectorHeader
          grades={grades}
          subjects={subjects}
          selectedGrade={selectedGrade}
          selectedSubject={selectedSubject}
          onChangeGrade={handleChangeGrade}
          onChangeSubject={handleChangeSubject}
        />
      ),
    });
  }, [
    navigation,
    grades,
    subjects,
    selectedGrade,
    selectedSubject,
    handleChangeGrade,
    handleChangeSubject,
  ]);

  const handleTextbookPress = (textbook: Textbook) => {
    setSelectedTextbookId(textbook.id);
    // 全局单选：本地立即生效，服务端据此同步年级/科目/版本
    dispatch(setTextbookId(textbook.id));
    dispatch(updateSettings({ textbookId: textbook.id }));
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16 * spacing, paddingTop: 8 * spacing, paddingBottom: 24 * spacing }}
        showsVerticalScrollIndicator={false}
      >
        {!selectedGrade || !selectedSubject ? (
          <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
            <Text style={{ fontSize: 44 * font, marginBottom: 12 * spacing }}>📚</Text>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 15 * font,
                textAlign: 'center',
                lineHeight: 22 * font,
              }}
            >
              {t.studySelectScope}
            </Text>
          </View>
        ) : visibleTextbooks.length === 0 ? (
          <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
            <Text style={{ fontSize: 44 * font, marginBottom: 12 * spacing }}>📚</Text>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 15 * font,
                textAlign: 'center',
                lineHeight: 22 * font,
              }}
            >
              {t.textbookEmpty}
            </Text>
          </View>
        ) : (
          // 教材即「版本」：年级 + 科目筛选后剩下的全部教材
          visibleTextbooks.map((textbook) => {
            const selected = textbook.id === selectedTextbookId;
            return (
              <TouchableOpacity
                key={textbook.id}
                onPress={() => handleTextbookPress(textbook)}
                activeOpacity={0.75}
                style={[
                  styles.textbookRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: selected ? colors.accent : colors.border,
                    borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
                    borderRadius: 12 * radius,
                    padding: 10 * spacing,
                    marginBottom: 10 * spacing,
                    elevation: isDark ? 0 : 2,
                    shadowOpacity: isDark ? 0 : 0.04,
                  },
                ]}
              >
                {/* 封面：竖版 3:4 */}
                {textbook.coverUrl ? (
                  <Image
                    source={textbook.coverUrl}
                    style={{
                      width: 60 * spacing,
                      aspectRatio: 3 / 4,
                      borderRadius: 8 * radius,
                    }}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View
                    style={{
                      width: 60 * spacing,
                      aspectRatio: 3 / 4,
                      borderRadius: 8 * radius,
                      backgroundColor: colors.surfaceSecondary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="book-outline" size={22 * font} color={colors.textTertiary} />
                  </View>
                )}

                <View style={[styles.textbookInfo, { marginLeft: 10 * spacing }]}>
                  <Text
                    style={{ color: colors.text, fontSize: 15 * font, fontWeight: '600' }}
                    numberOfLines={1}
                  >
                    {textbook.publisherName}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12 * font,
                      marginTop: 3 * spacing,
                    }}
                    numberOfLines={1}
                  >
                    {textbook.gradeName}
                    {textbook.semesterLabel}
                  </Text>
                  <Text
                    style={{
                      color: colors.textTertiary,
                      fontSize: 11 * font,
                      marginTop: 5 * spacing,
                    }}
                    numberOfLines={1}
                  >
                    {t.textbookChapterQuestions(textbook.questionCount)}
                  </Text>
                </View>

                <View
                  style={{
                    width: 22 * spacing,
                    height: 22 * spacing,
                    borderRadius: 11 * radius,
                    borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
                    borderColor: colors.border,
                    backgroundColor: selected ? colors.accent : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selected && <Ionicons name="checkmark" size={14 * font} color={colors.surface} />}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center' },
  textbookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  textbookInfo: { flex: 1 },
});

export default TextbookScreen;

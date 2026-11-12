import { Ionicons } from '@expo/vector-icons';
import type { Grade, Subject, Textbook, TextbookCatalog } from '@sharp/shared';
import { Image } from 'expo-image';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useDensity } from '../hooks/useDensity';
import { useTheme } from '../hooks/useTheme';
import { useTranslation } from '../i18n/useTranslation';
import { api } from '../services/api';
import type { AppDispatch, RootState } from '../stores';
import { setTextbookId, updateSettings } from '../stores/settingsSlice';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type Step = 1 | 2 | 3;

/** 后端存的是 Ionicons 名称，历史/异常值不渲染图标，仅显示文字 */
function isIoniconName(value?: string | null): value is IoniconName {
  return !!value && value in Ionicons.glyphMap;
}

/** 科目图标优先用后端 Subject.icon 维护的 Ionicons 名称，缺失时回退到通用书签图标 */
const getSubjectIcon = (icon: string | null): IoniconName =>
  isIoniconName(icon) ? icon : 'bookmark-outline';

interface ScopeSelectorProps {
  grades: Grade[];
  subjects: Subject[];
  selectedGrade: Grade | null;
  selectedSubject: Subject | null;
  onChangeGrade: (grade: Grade | null) => void;
  onChangeSubject: (subject: Subject | null) => void;
  /** 胶囊最大宽度：导航栏里居中摆放时由外层按左右可用空间收敛，避免与左侧内容重叠 */
  maxWidth?: number;
}

/** 胶囊在窗口中的位置，供首次引导的高亮挖洞使用 */
export interface ScopeCapsuleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 对外暴露：打开三步选择弹层、测量胶囊位置 */
export interface ScopeSelectorHandle {
  open: () => void;
  measure: (callback: (rect: ScopeCapsuleRect | null) => void) => void;
}

/**
 * 全局学习范围选择器：与 Web 端一致，按「学段（含年级）→ 科目 → 教材」三步走。
 * 点年级自动进入第 2 步，点科目自动进入第 3 步，点教材即保存并关闭；
 * 顶部步骤条与「上一步」都可回退。年级/科目由外层写入设置，
 * 教材直接写账号设置的 textbookId，年级/科目/版本由服务端反推并回传 Redux。
 */
const ScopeSelector = forwardRef<ScopeSelectorHandle, ScopeSelectorProps>(({
  grades,
  subjects,
  selectedGrade,
  selectedSubject,
  onChangeGrade,
  onChangeSubject,
  maxWidth,
}, ref) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Modal 内的百分比 maxHeight 在部分机型上解析不到父级高度，弹层会被内容撑出屏幕底部，
  // 这里直接用窗口高度算出像素上限，保证顶部不会顶出状态栏、底部内容可滚动。
  const sheetMaxHeight = Math.round(windowHeight * 0.88);
  const dispatch = useDispatch<AppDispatch>();
  const savedTextbookId = useSelector((state: RootState) => state.settings.textbookId);

  const [visible, setVisible] = useState(false);
  // 胶囊节点：首次引导需要在窗口坐标系里测量它的位置
  const capsuleRef = useRef<View>(null);
  // Web 键盘聚焦时给一点浅色底，弥补去掉描边后的可点提示
  const [capsuleFocused, setCapsuleFocused] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<TextbookCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  // 弹层内的即时选择：年级/科目落库是异步的，若直接用父级回传的 props 过滤，
  // 网络慢时第 3 步会先按旧值（或 null）渲染成空态。这里以点击到的对象为准。
  const [pickedGrade, setPickedGrade] = useState<Grade | null>(selectedGrade);
  const [pickedSubject, setPickedSubject] = useState<Subject | null>(selectedSubject);

  // 年级按学段（小学/初中/高中/大学）分组展示
  const stageGroups = useMemo(() => {
    const map = new Map<string, { id: string; name: string; grades: Grade[] }>();
    for (const grade of grades) {
      const key = grade.stageId ?? grade.stage;
      const group = map.get(key) ?? { id: key, name: grade.stage, grades: [] };
      group.grades.push(grade);
      map.set(key, group);
    }
    return Array.from(map.values());
  }, [grades]);

  const activeGroup =
    stageGroups.find((group) => group.id === activeStage) ?? stageGroups[0] ?? null;

  // 每次打开都回到第 1 步，并把学段定位到当前年级所属学段
  const handleOpen = useCallback(() => {
    setStep(1);
    setSavingId(null);
    setPickedGrade(selectedGrade);
    setPickedSubject(selectedSubject);
    setActiveStage(
      stageGroups.find((group) => group.grades.some((grade) => grade.id === selectedGrade?.id))
        ?.id ??
        stageGroups[0]?.id ??
        null,
    );
    setVisible(true);
  }, [selectedGrade, selectedSubject, stageGroups]);

  // 在窗口坐标系里测量胶囊，供首次引导绘制高亮挖洞；测不到时回传 null 由调用方降级
  const measure = useCallback((callback: (rect: ScopeCapsuleRect | null) => void) => {
    const node = capsuleRef.current;
    if (!node) {
      callback(null);
      return;
    }
    try {
      node.measureInWindow((x, y, width, height) => {
        const valid =
          Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(width) && Number.isFinite(height);
        callback(valid && width > 0 && height > 0 ? { x, y, width, height } : null);
      });
    } catch {
      callback(null);
    }
  }, []);

  useImperativeHandle(ref, () => ({ open: handleOpen, measure }), [handleOpen, measure]);

  // 教材目录在每次打开时拉取一次，三步内切换年级/科目只在本地过滤
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    setCatalogLoading(true);
    api
      .getTextbookCatalog()
      .then((data) => {
        if (alive) setCatalog(data);
      })
      .finally(() => {
        if (alive) setCatalogLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [visible]);

  const allTextbooks = useMemo(
    () =>
      catalog?.stages.flatMap((stage) => stage.subjects.flatMap((subject) => subject.textbooks)) ??
      [],
    [catalog],
  );

  // 第 3 步：当前年级 + 科目下可选的全部教材（用弹层内的即时选择，避免等设置回写）
  const textbooks = useMemo(() => {
    if (!pickedGrade || !pickedSubject) return [];
    return allTextbooks.filter(
      (textbook) =>
        textbook.gradeId === pickedGrade.id && textbook.subjectId === pickedSubject.id,
    );
  }, [allTextbooks, pickedGrade, pickedSubject]);

  // 年级/科目被单独改动后，旧教材不再属于当前范围：对外视为未选，与 Web 一致
  const currentTextbook = useMemo(() => {
    if (!pickedGrade || !pickedSubject) return null;
    const textbook = allTextbooks.find((item) => item.id === savedTextbookId);
    if (!textbook) return null;
    if (textbook.gradeId !== pickedGrade.id) return null;
    if (textbook.subjectId !== pickedSubject.id) return null;
    return textbook;
  }, [allTextbooks, savedTextbookId, pickedGrade, pickedSubject]);

  const stepMetas: { step: Step; label: string; value: string | null }[] = [
    { step: 1, label: t.scopeStepStage, value: pickedGrade?.name ?? null },
    { step: 2, label: t.scopeStepSubject, value: pickedSubject?.name ?? null },
    {
      step: 3,
      label: t.scopeStepTextbook,
      value: currentTextbook
        ? `${currentTextbook.publisherName}${currentTextbook.semesterLabel}`
        : null,
    },
  ];

  const canGoStep2 = Boolean(pickedGrade);
  const canGoStep3 = Boolean(pickedGrade && pickedSubject);
  const isReachable = (target: Step) => {
    if (target === 1) return true;
    if (target === 2) return canGoStep2;
    return canGoStep3;
  };

  // 点年级：视为选定学段，自动进入第 2 步；落库异步进行，弹层内先按新年级展示
  const handlePickGrade = (grade: Grade) => {
    setActiveStage(stageGroups.find((group) => group.grades.includes(grade))?.id ?? activeStage);
    setPickedGrade(grade);
    if (grade.id !== selectedGrade?.id) onChangeGrade(grade);
    setStep(2);
  };

  // 点科目：自动进入第 3 步，并立即按当前年级 + 该科目过滤教材
  const handlePickSubject = (subject: Subject) => {
    setPickedSubject(subject);
    if (subject.id !== selectedSubject?.id) onChangeSubject(subject);
    setStep(3);
  };

  // 选中教材即保存并关闭；年级/科目/版本由服务端反推后写回全局设置
  const handlePickTextbook = async (textbook: Textbook) => {
    if (savingId) return;
    if (textbook.id === savedTextbookId) {
      setVisible(false);
      return;
    }
    setSavingId(textbook.id);
    dispatch(setTextbookId(textbook.id));
    try {
      await dispatch(updateSettings({ textbookId: textbook.id }));
      setVisible(false);
    } finally {
      setSavingId(null);
    }
  };

  // 胶囊（弹层关闭时也可见）按父级回传的全局范围匹配教材，用于显示版本
  const capsuleTextbook = useMemo(() => {
    if (!selectedGrade || !selectedSubject) return null;
    const textbook = allTextbooks.find((item) => item.id === savedTextbookId);
    if (!textbook) return null;
    if (textbook.gradeId !== selectedGrade.id) return null;
    if (textbook.subjectId !== selectedSubject.id) return null;
    return textbook;
  }, [allTextbooks, savedTextbookId, selectedGrade, selectedSubject]);

  // 冷启动时已选教材但还没拉过目录：补拉一次，让胶囊能显示版本
  useEffect(() => {
    if (!savedTextbookId || allTextbooks.length > 0) return;
    let alive = true;
    api.getTextbookCatalog().then((data) => {
      if (alive) setCatalog(data);
    });
    return () => {
      alive = false;
    };
  }, [savedTextbookId, allTextbooks.length]);

  // 与 Web 一致：版本 + 册次简称（全/上/下）
  const semesterMark = (semester: number) => (semester === 0 ? '全' : semester === 1 ? '上' : '下');

  const displayText = (() => {
    if (selectedGrade && selectedSubject) {
      const base = `${selectedGrade.name} · ${selectedSubject.name}`;
      return capsuleTextbook
        ? `${base} · ${capsuleTextbook.publisherName}${semesterMark(capsuleTextbook.semester)}`
        : base;
    }
    if (selectedGrade) return selectedGrade.name;
    if (selectedSubject) return selectedSubject.name;
    return t.studySelectScope;
  })();

  const chipStyle = (active: boolean) => ({
    backgroundColor: active ? colors.accentLight : colors.background,
    borderColor: active ? colors.accent : colors.border,
    borderRadius: 12 * radius,
    paddingHorizontal: 12 * spacing,
    paddingVertical: 8 * spacing,
  });

  const heading = (text: string) => (
    <Text style={{ color: colors.text, fontSize: 14 * font, fontWeight: '700' }}>{text}</Text>
  );

  return (
    <>
      <TouchableOpacity
        ref={capsuleRef}
        testID="scope-capsule"
        accessibilityRole="button"
        accessibilityLabel={t.scopeTitle}
        style={[
          styles.capsule,
          {
            // 透明底：直接融在 header 的浅绿渐变上，只保留文字、箭头与间距
            borderRadius: 14 * radius,
            paddingHorizontal: 12 * spacing,
            paddingVertical: 8 * spacing,
            // 默认上限 220；导航栏居中时外层会传入更小的值，长教材名尾部省略
            maxWidth: maxWidth ?? 220,
            // 聚焦态用浅色底提示可点，不恢复描边
            backgroundColor: capsuleFocused ? colors.accentLight : 'transparent',
          },
        ]}
        activeOpacity={0.6}
        onFocus={() => setCapsuleFocused(true)}
        onBlur={() => setCapsuleFocused(false)}
        onPress={handleOpen}
      >
        <Text
          style={{
            flexShrink: 1,
            color: selectedGrade || selectedSubject ? colors.text : colors.textTertiary,
            fontSize: 13 * font,
            fontWeight: '600',
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayText}
        </Text>
        <Ionicons
          name="chevron-down"
          size={12 * font}
          color={colors.textTertiary}
          style={{ marginLeft: 4 * spacing }}
        />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setVisible(false)} />
          <View
            testID="scope-sheet"
            style={[
              styles.sheet,
              {
                maxHeight: sheetMaxHeight,
                backgroundColor: colors.surface,
                borderTopLeftRadius: 20 * radius,
                borderTopRightRadius: 20 * radius,
              },
            ]}
          >
            {/* 顶部操作栏：关闭按钮独占右侧，不与步骤条争宽度 */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16 * spacing,
                paddingTop: 10 * spacing,
              }}
            >
              <View style={{ width: 32 * spacing }} />
              <View
                style={{
                  width: 36 * spacing,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.border,
                }}
              />
              <TouchableOpacity
                testID="scope-close"
                accessibilityRole="button"
                accessibilityLabel={t.scopeClose}
                onPress={() => setVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ width: 32 * spacing, alignItems: 'flex-end', padding: 2 }}
              >
                <Ionicons name="close" size={20 * font} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* 步骤条：独占整行，标签带已选值，可回退到已走过的步骤 */}
            <View
              style={{
                paddingHorizontal: 16 * spacing,
                paddingTop: 6 * spacing,
              }}
            >
              {/* 单行横向滚动：标签不压缩不换行，末尾留出内边距，
                  滚到最右时最后一个标签能完整露出，不会被右边缘裁掉 */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  alignItems: 'center',
                  gap: 3 * spacing,
                  paddingRight: 16 * spacing,
                }}
              >
                {stepMetas.map((meta, index) => {
                  const active = step === meta.step;
                  const reachable = isReachable(meta.step);
                  return (
                    <React.Fragment key={meta.step}>
                      {index > 0 && (
                        <Ionicons name="chevron-forward" size={12 * font} color={colors.textTertiary} />
                      )}
                      <TouchableOpacity
                        disabled={!reachable}
                        activeOpacity={0.7}
                        onPress={() => setStep(meta.step)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3 * spacing,
                          paddingHorizontal: 6 * spacing,
                          paddingVertical: 7 * spacing,
                          borderRadius: 10 * radius,
                          backgroundColor: active ? colors.accentLight : 'transparent',
                          opacity: reachable ? 1 : 0.5,
                          flexShrink: 0,
                        }}
                      >
                        <View
                          style={{
                            width: 14 * spacing,
                            height: 14 * spacing,
                            borderRadius: 7 * radius,
                            borderWidth: StyleSheet.hairlineWidth,
                            borderColor: active ? colors.accent : colors.textTertiary,
                            backgroundColor: active ? colors.accent : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {meta.value && !active ? (
                            <Ionicons name="checkmark" size={10 * font} color={colors.textSecondary} />
                          ) : (
                            <Text
                              style={{
                                color: active ? colors.surface : colors.textSecondary,
                                fontSize: 9 * font,
                                fontWeight: '700',
                              }}
                            >
                              {meta.step}
                            </Text>
                          )}
                        </View>
                        <Text
                          style={{
                            color: active
                              ? colors.accent
                              : reachable
                                ? colors.textSecondary
                                : colors.textTertiary,
                            fontSize: 11 * font,
                            fontWeight: '700',
                          }}
                        >
                          {t.scopeTitleWithValue(meta.label, meta.value ?? t.scopeNotChosen)}
                        </Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </ScrollView>
            </View>

            {/* 步骤内容：超出屏幕高度时自身滚动，不会被裁切 */}
            <ScrollView
              style={{ flexShrink: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16 * spacing,
                paddingTop: 14 * spacing,
                // 底部再让出安全区，最后一行选项不会被 Home Indicator 压住
                paddingBottom: Math.max(20 * spacing, insets.bottom + 16),
              }}
            >
              {step === 1 && (
                <View>
                  {heading(
                    t.scopeTitleWithValue(t.scopeChooseStage, activeGroup?.name ?? t.scopeNotChosen),
                  )}
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 8 * spacing,
                      marginTop: 10 * spacing,
                    }}
                  >
                    {stageGroups.map((group) => {
                      const active = activeGroup?.id === group.id;
                      return (
                        <TouchableOpacity
                          key={group.id}
                          style={[styles.optionChip, chipStyle(active)]}
                          onPress={() => setActiveStage(group.id)}
                        >
                          <Text
                            style={{
                              color: active ? colors.accent : colors.text,
                              fontSize: 14 * font,
                              fontWeight: '500',
                            }}
                          >
                            {group.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={{ marginTop: 20 * spacing }}>
                    {heading(
                      t.scopeTitleWithValue(
                        t.scopeChooseGrade,
                        pickedGrade?.name ?? t.scopeNotChosen,
                      ),
                    )}
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 8 * spacing,
                      marginTop: 10 * spacing,
                    }}
                  >
                    {activeGroup?.grades.length ? (
                      activeGroup.grades.map((grade) => {
                        const active = pickedGrade?.id === grade.id;
                        return (
                          <TouchableOpacity
                            key={grade.id}
                            style={[styles.optionChip, chipStyle(active)]}
                            onPress={() => handlePickGrade(grade)}
                          >
                            <Text
                              style={{
                                color: active ? colors.accent : colors.text,
                                fontSize: 14 * font,
                                fontWeight: '500',
                              }}
                            >
                              {grade.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <Text style={{ color: colors.textTertiary, fontSize: 12 * font }}>
                        {t.scopeEmptyGrades}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {step === 2 && (
                <View>
                  {pickedGrade && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12 * font }}>
                      {t.scopeCurrentGrade(pickedGrade.name)}
                    </Text>
                  )}
                  <View style={{ marginTop: 12 * spacing }}>{heading(t.scopeChooseSubject)}</View>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 8 * spacing,
                      marginTop: 10 * spacing,
                    }}
                  >
                    {subjects.map((subject) => {
                      const active = pickedSubject?.id === subject.id;
                      const tint = active ? colors.accent : colors.textSecondary;
                      return (
                        <TouchableOpacity
                          key={subject.id}
                          style={[
                            styles.optionChip,
                            chipStyle(active),
                            { flexDirection: 'row', alignItems: 'center', gap: 4 * spacing },
                          ]}
                          onPress={() => handlePickSubject(subject)}
                        >
                          <Ionicons name={getSubjectIcon(subject.icon)} size={14 * font} color={tint} />
                          <Text
                            style={{
                              color: active ? colors.accent : colors.text,
                              fontSize: 14 * font,
                              fontWeight: '500',
                            }}
                          >
                            {subject.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {step === 3 && (
                <View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 8 * spacing,
                    }}
                  >
                    {heading(t.scopeChooseTextbook)}
                    {!catalogLoading && textbooks.length > 0 && (
                      <Text style={{ color: colors.textTertiary, fontSize: 12 * font, fontWeight: '600' }}>
                        {t.scopeCount(textbooks.length)}
                      </Text>
                    )}
                  </View>
                  {pickedGrade && pickedSubject && (
                    <Text
                      style={{ color: colors.textSecondary, fontSize: 12 * font, marginTop: 6 * spacing }}
                    >
                      {pickedGrade.name} · {pickedSubject.name}
                    </Text>
                  )}

                  {catalogLoading ? (
                    <View style={{ paddingVertical: 40 * spacing, alignItems: 'center' }}>
                      <ActivityIndicator color={colors.accent} />
                    </View>
                  ) : textbooks.length === 0 ? (
                    <View
                      style={{
                        marginTop: 12 * spacing,
                        padding: 16 * spacing,
                        borderRadius: 12 * radius,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 14 * font, fontWeight: '700' }}>
                        {t.scopeEmptyTextbooksTitle}
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 12 * font,
                          marginTop: 6 * spacing,
                          textAlign: 'center',
                          lineHeight: 18 * font,
                        }}
                      >
                        {t.scopeEmptyTextbooksBody}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: 12 * spacing, gap: 8 * spacing }}>
                      {textbooks.map((textbook) => {
                        const selected = textbook.id === savedTextbookId;
                        const saving = savingId === textbook.id;
                        return (
                          <TouchableOpacity
                            key={textbook.id}
                            activeOpacity={0.75}
                            disabled={Boolean(savingId)}
                            onPress={() => handlePickTextbook(textbook)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              padding: 8 * spacing,
                              borderRadius: 12 * radius,
                              borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
                              borderColor: selected ? colors.accent : colors.border,
                              backgroundColor: colors.surface,
                              opacity: saving ? 0.7 : 1,
                            }}
                          >
                            {textbook.coverUrl ? (
                              <Image
                                source={textbook.coverUrl}
                                style={{
                                  width: 44 * spacing,
                                  aspectRatio: 3 / 4,
                                  borderRadius: 6 * radius,
                                }}
                                contentFit="cover"
                                transition={150}
                              />
                            ) : (
                              <View
                                style={{
                                  width: 44 * spacing,
                                  aspectRatio: 3 / 4,
                                  borderRadius: 6 * radius,
                                  backgroundColor: colors.surfaceSecondary,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Ionicons name="book-outline" size={18 * font} color={colors.textTertiary} />
                              </View>
                            )}

                            <View style={{ flex: 1, marginLeft: 10 * spacing }}>
                              <Text
                                style={{ color: colors.text, fontSize: 14 * font, fontWeight: '700' }}
                                numberOfLines={1}
                              >
                                {textbook.publisherName} · {textbook.semesterLabel}
                              </Text>
                              <Text
                                style={{
                                  color: colors.textSecondary,
                                  fontSize: 12 * font,
                                  marginTop: 3 * spacing,
                                }}
                                numberOfLines={1}
                              >
                                {t.scopeChaptersCount(textbook.chapterCount)} ·{' '}
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
                              {saving ? (
                                <ActivityIndicator size="small" color={colors.accent} />
                              ) : selected ? (
                                <Ionicons name="checkmark" size={14 * font} color={colors.surface} />
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {step > 1 && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.borderLight,
                  paddingHorizontal: 16 * spacing,
                  paddingTop: 8 * spacing,
                  // 底部固定栏同样让出安全区
                  paddingBottom: Math.max(8 * spacing, insets.bottom + 6),
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setStep((current) => (current > 1 ? ((current - 1) as Step) : current))}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 6 * spacing }}
                >
                  <Ionicons name="chevron-back" size={16 * font} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13 * font, fontWeight: '600' }}>
                    {t.scopeBack}
                  </Text>
                </TouchableOpacity>

                {step === 3 && !catalogLoading && textbooks.length === 0 && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setVisible(false)}
                    style={{ paddingHorizontal: 14 * spacing, paddingVertical: 6 * spacing }}
                  >
                    <Text style={{ color: colors.accent, fontSize: 13 * font, fontWeight: '700' }}>
                      {t.scopeDone}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
});

const styles = StyleSheet.create({
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    // 透明底，不加描边；点按/聚焦反馈靠透明度与浅色底
    // 版本信息比「年级 · 科目」长，给导航栏留出空间，超出时尾部省略
    maxWidth: 220,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    // 高度上限由组件内按窗口高度算出的 sheetMaxHeight 控制（Modal 内百分比不可靠），
    // 内容超出时靠内部 ScrollView 滚动；圆角需要裁掉溢出的内容
    overflow: 'hidden',
  },
  optionChip: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});

ScopeSelector.displayName = 'ScopeSelector';

export default ScopeSelector;

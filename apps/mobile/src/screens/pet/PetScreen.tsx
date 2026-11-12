import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PetBackpackItem, PetFeedResult, PetHomeData } from '@sharp/shared';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import PetMotion from '../../components/PetMotion';
import { type PetAnimationKind } from '../../components/PetLottie';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import { cardShadow } from '../../theme/shadows';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Pet'>;

interface PetScreenProps {
  navigation: NavigationProp;
}

const STATE_COLOR_KEYS = {
  active: 'successLight',
  normal: 'accentLight',
  hungry: 'warningLight',
  asleep: 'borderLight',
} as const;

// 状态标签文字色跟随底色，避免浅色底上出现低对比文字
const STATE_TEXT_COLOR_KEYS = {
  active: 'successText',
  normal: 'accentStrong',
  hungry: 'warning',
  asleep: 'textSecondary',
} as const;

/** 食物背包最多平铺 3 项，超出的在列表内部滚动 */
const BACKPACK_VISIBLE_ROWS = 3;
/**
 * 弹层里除食物列表外的固定高度估算：上下内边距 + 标题行 + 列表外边距 +
 * 喂食数量行 + 喂食按钮 + 底部安全区/结果提示
 */
const SHEET_RESERVED_HEIGHT = 250;

const PetScreen: React.FC<PetScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [data, setData] = useState<PetHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // 喂食弹层
  const [feedOpen, setFeedOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [feeding, setFeeding] = useState(false);
  const [feedResult, setFeedResult] = useState<PetFeedResult | null>(null);
  const [feedError, setFeedError] = useState<string | null>(null);
  // 食物行实测高度：列表区高度 = min(项数, 3) 行，用来让 1~3 项贴合内容、超出再滚动
  const [foodRowHeight, setFoodRowHeight] = useState(0);

  // Lottie：idle 循环；喂食/进化播一次后回到 idle
  const [animation, setAnimation] = useState<PetAnimationKind>('idle');
  const pendingEvolve = useRef(false);

  // 养宠规则说明弹窗
  const [rulesOpen, setRulesOpen] = useState(false);

  const loadPet = useCallback(async () => {
    try {
      const result = await api.getPet();
      setData(result);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPet();
    }, [loadPet]),
  );

  const pet = data?.pet ?? null;

  const stateLabel = useMemo(() => {
    if (!pet) return '';
    return {
      active: t.petStateActive,
      normal: t.petStateNormal,
      hungry: t.petStateHungry,
      asleep: t.petStateAsleep,
    }[pet.state];
  }, [pet, t]);

  const expProgress = pet && pet.expToNext > 0 ? Math.min(1, pet.experience / pet.expToNext) : 1;
  const satietyProgress = pet ? Math.min(1, pet.satiety / pet.satietyMax) : 0;
  // 已到最终阶段且经验满：不再显示「距下一级还需」
  const isMaxLevel =
    !!pet &&
    pet.level >= (pet.route[pet.route.length - 1]?.level ?? 0) &&
    pet.expToNext === pet.experience;

  const foodQuantity = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of data?.backpack ?? []) map[item.foodType] = item.quantity;
    return map;
  }, [data?.backpack]);

  const hasFood = useMemo(
    () => (data?.backpack ?? []).some((item) => item.quantity > 0),
    [data?.backpack],
  );

  // 食物背包弹层高度：跟着内容走，最多 85% 屏高（小屏 / 横屏也不会超出屏幕）
  const backpack = data?.backpack ?? [];
  const sheetMaxHeight = Math.round(windowHeight * 0.85);
  const visibleFoodRows = Math.min(backpack.length, BACKPACK_VISIBLE_ROWS);
  const foodRowGap = 8 * spacing;
  // 1~3 项时列表高度贴合内容；超过 3 项时固定 3 行高，其余在列表内部滚动
  const foodListHeight =
    foodRowHeight > 0 && visibleFoodRows > 0
      ? visibleFoodRows * foodRowHeight + (visibleFoodRows - 1) * foodRowGap
      : undefined;
  // 小屏兜底：给标题 / 数量步进器 / 按钮 / 底部安全区留够位置，列表再高也不会把按钮顶出屏幕
  const foodListMaxHeight = Math.max(0, sheetMaxHeight - SHEET_RESERVED_HEIGHT);

  const openFeed = useCallback(() => {
    setFeedError(null);
    setFeedResult(null);
    const first = data?.backpack.find((item) => item.quantity > 0);
    setSelectedFood(first?.foodType ?? null);
    setQuantity(1);
    setFeedOpen(true);
  }, [data?.backpack]);

  const handleFeed = useCallback(async () => {
    if (!selectedFood || feeding) return;
    const owned = foodQuantity[selectedFood] ?? 0;
    const qty = Math.min(quantity, owned);
    if (qty <= 0) {
      setFeedError(t.petFoodNotEnough);
      return;
    }

    setFeeding(true);
    setFeedError(null);
    try {
      const result = await api.feedPet(selectedFood, qty);
      setFeedResult(result);
      await loadPet();
      // 进食动画播完；若本次进化，再接着播进化动画
      pendingEvolve.current = result.stageUp;
      setAnimation('feed');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'PET_FULL' || message.includes('吃饱')) setFeedError(t.petPetFull);
      else if (message === 'FOOD_NOT_ENOUGH') setFeedError(t.petFoodNotEnough);
      else setFeedError(t.petFeedFailed);
    } finally {
      setFeeding(false);
    }
  }, [foodQuantity, loadPet, quantity, selectedFood, feeding, t]);

  const handleAnimationFinish = useCallback(() => {
    if (pendingEvolve.current) {
      pendingEvolve.current = false;
      setAnimation('evolve');
      return;
    }
    setAnimation('idle');
  }, []);

  // 两条进度条统一：4px 高、圆角、同一条轨道底色
  const renderProgress = (progress: number, color: string) => (
    <View
      style={[
        styles.barTrack,
        { backgroundColor: colors.borderLight, height: 4, borderRadius: 2 },
      ]}
    >
      <View
        style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: color, borderRadius: 2 }]}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary, fontSize: 14 * font }}>{t.petLoadFailed}</Text>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            loadPet();
          }}
          style={[styles.retryButton, { borderColor: colors.border, borderRadius: 10 * radius, marginTop: 12 * spacing }]}
        >
          <Text style={{ color: colors.accentStrong, fontSize: 14 * font }}>{t.petRetry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.text, fontSize: 20 * font, fontWeight: '700' }}>{t.petCardEmptyTitle}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14 * font, marginTop: 6 * spacing }}>
          {t.petCardEmptyDesc}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('PetAdopt')}
          style={[
            styles.primaryButton,
            { backgroundColor: colors.accent, borderRadius: 12 * radius, marginTop: 18 * spacing },
          ]}
        >
          <Text style={styles.primaryButtonText}>{t.petAdoptCta}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 16 * spacing, paddingTop: 0, paddingBottom: 12 * spacing }}
      showsVerticalScrollIndicator={false}
    >
      {/* 形象区 */}
      <View
        style={[
          styles.hero,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: 16 * radius,
            padding: 16 * spacing,
            marginTop: 0,
          },
          cardShadow(isDark),
        ]}
      >
        {/* 舞台框：宠物形象作为视觉主体，圆角虚线框，透明底 */}
        <View style={[styles.stage, { borderRadius: 16 * radius }]}>
          <View style={styles.stagePet}>
            {pet.growthStage.idleLottieUrl || pet.growthStage.imageUrl ? (
              <PetMotion
                manifestUrl={pet.growthStage.motionManifestUrl}
                kind={animation}
                idleUrl={pet.growthStage.idleLottieUrl}
                feedUrl={pet.growthStage.feedLottieUrl}
                evolveUrl={pet.growthStage.evolveLottieUrl}
                imageUrl={pet.growthStage.imageUrl}
                sideImageUrl={pet.growthStage.sideImageUrl}
                size={200}
                onFinish={handleAnimationFinish}
              />
            ) : (
              <Text style={{ fontSize: 64 }}>{pet.species.icon ?? '🐾'}</Text>
            )}
          </View>
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.stageDash,
              { borderColor: colors.accent, borderRadius: 16 * radius, opacity: 0.45 },
            ]}
          />
        </View>

        {/* 名字 · 等级 + 状态标签，左对齐同一行 */}
        <View style={[styles.heroHeader, { gap: 8 * spacing, marginTop: 14 * spacing }]}>
          <Text
            numberOfLines={1}
            style={{ flexShrink: 1, color: colors.text, fontSize: 19 * font, fontWeight: '700' }}
          >
            {pet.nickname} · {t.petLevel(pet.level)}
          </Text>
          <View
            style={[
              styles.stateChip,
              {
                backgroundColor: colors[STATE_COLOR_KEYS[pet.state]],
                borderRadius: 999,
                paddingHorizontal: 8 * spacing,
                paddingVertical: 3 * spacing,
              },
            ]}
          >
            <Text style={{ color: colors[STATE_TEXT_COLOR_KEYS[pet.state]], fontSize: 11 * font }}>
              {stateLabel}
            </Text>
          </View>
        </View>

        {/* 物种 · 阶段 · 陪伴天数 */}
        <Text style={{ color: colors.textSecondary, fontSize: 12 * font, marginTop: 4 * spacing }}>
          {pet.species.name} · {pet.growthStage.name} · {t.petCompanionDays(pet.companionDays)}
        </Text>

        {/* 经验：在小字层级展示，位于饱腹度上方 */}
        <View style={{ marginTop: 16 * spacing }}>
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textTertiary, fontSize: 10.5 * font }}>
              {isMaxLevel
                ? t.petMaxLevel
                : t.petExpToNext(Math.max(0, pet.expToNext - pet.experience))}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: 10.5 * font }}>
              {pet.experience} / {pet.expToNext}
            </Text>
          </View>
          {renderProgress(expProgress, colors.accent)}
        </View>

        {/* 饱腹度：文字层级与经验行保持一致，放在经验条下方 */}
        <View style={{ marginTop: 12 * spacing }}>
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textTertiary, fontSize: 10.5 * font }}>
              {t.petSatiety}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: 10.5 * font }}>
              {pet.satiety} / {pet.satietyMax}
            </Text>
          </View>
          {renderProgress(satietyProgress, colors.warning)}
        </View>

        {/* 主操作：等宽并列，喂食为浅底描边主按钮，去练习为次要描边 */}
        <View style={[styles.rowGap, { marginTop: 16 * spacing, gap: 10 * spacing }]}>
          <TouchableOpacity
            onPress={openFeed}
            disabled={!pet.canFeed}
            style={[
              styles.primaryButton,
              {
                height: 46,
                borderRadius: 10 * radius,
                borderWidth: 1,
                backgroundColor: pet.canFeed ? colors.accentLight : colors.borderLight,
                borderColor: pet.canFeed ? colors.accent : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.primaryButtonText,
                { color: pet.canFeed ? colors.accentStrong : colors.textTertiary },
              ]}
            >
              {t.petFeedButton}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('StudyTab', { screen: 'Study' })}
            style={[
              styles.secondaryButton,
              { height: 46, borderColor: colors.border, borderRadius: 10 * radius },
            ]}
          >
            <Text style={{ color: colors.text, fontSize: 15 * font, fontWeight: '600' }}>
              {t.petGoPractice}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={14 * font}
              color={colors.text}
              style={{ marginLeft: 4 * spacing }}
            />
          </TouchableOpacity>
        </View>
        {!hasFood && (
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 11.5 * font,
              marginTop: 8 * spacing,
              textAlign: 'center',
            }}
          >
            {t.petBackpackEmpty}
          </Text>
        )}
      </View>

      {/* 进化路线 */}
      <View style={{ marginTop: 18 * spacing }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 9 * spacing,
          }}
        >
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 15 * font }]}>
            {t.petRouteTitle}
          </Text>
          <TouchableOpacity
            onPress={() => setRulesOpen(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t.petRulesTitle}
            style={{ padding: 4 }}
          >
            <Ionicons name="help-circle-outline" size={18 * font} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.rowGap, { gap: 8 * spacing }]}>
          {pet.route.map((stage) => {
            const active = stage.stageKey === pet.growthStage.key;
            const past = !active && stage.level <= pet.level;
            const locked = !active && !past;
            return (
              <View
                key={stage.stageKey}
                style={[
                  styles.routeCard,
                  active ? cardShadow(isDark) : null,
                  {
                    backgroundColor: locked ? colors.borderLight : colors.surface,
                    borderColor: active ? colors.border : past ? colors.border : colors.borderLight,
                    borderRadius: 12 * radius,
                    padding: 10 * spacing,
                    opacity: locked ? 0.6 : 1,
                  },
                ]}
              >
                {stage.imageUrl ? (
                  <Image
                    source={{ uri: stage.imageUrl }}
                    contentFit="contain"
                    style={[styles.routeImage, locked && { opacity: 0.5 }]}
                  />
                ) : (
                  <Text style={{ fontSize: 28, opacity: locked ? 0.5 : 1 }}>
                    {pet.species.icon ?? '🐾'}
                  </Text>
                )}
                <Text
                  style={{
                    color: locked
                      ? colors.textTertiary
                      : colors.text,
                    fontSize: 13 * font,
                    fontWeight: active ? '700' : past ? '600' : '500',
                    marginTop: 4 * spacing,
                  }}
                >
                  {stage.name}
                </Text>
                <Text
                  style={{
                    color: locked ? colors.textTertiary : colors.textTertiary,
                    fontSize: 10.5 * font,
                    marginTop: 2 * spacing,
                  }}
                >
                  {t.petLevel(stage.level)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 档案数据 */}
      <View style={[styles.rowGap, { marginTop: 18 * spacing, gap: 8 * spacing }]}>
        {[
          { label: t.petTotalCorrect, value: String(data?.stats.totalCorrect ?? 0) },
          { label: t.petTotalFeeds, value: String(data?.stats.feedCount ?? 0) },
          { label: t.petFavoriteSubject, value: data?.stats.favoriteSubject ?? t.petNoData },
        ].map((item) => (
          <View
            key={item.label}
            style={[
              styles.statCard,
              cardShadow(isDark),
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: 12 * radius,
                padding: 12 * spacing,
              },
            ]}
          >
            <Text style={{ color: colors.textTertiary, fontSize: 11 * font }}>{item.label}</Text>
            <Text
              numberOfLines={1}
              style={{ color: colors.text, fontSize: 16 * font, fontWeight: '700', marginTop: 4 * spacing }}
            >
              {item.value}
            </Text>
          </View>
        ))}
      </View>

      {/* 最近喂养 */}
      <View style={{ marginTop: 18 * spacing }}>
        <View style={[styles.rowBetween, { marginBottom: 9 * spacing }]}>
          <Text style={{ color: colors.text, fontSize: 15 * font, fontWeight: '700' }}>{t.petRecentFeeds}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PetFeeds')} hitSlop={8}>
            <Text style={{ color: colors.accentStrong, fontSize: 11.5 * font }}>{t.petViewAll}</Text>
          </TouchableOpacity>
        </View>

        {(data?.recentFeeds ?? []).length === 0 ? (
          <Text style={{ color: colors.textSecondary, fontSize: 13 * font }}>{t.petNoFeeds}</Text>
        ) : (
          <View style={{ gap: 8 * spacing }}>
            {(data?.recentFeeds ?? []).map((record) => (
              <View
                key={record.id}
                style={[
                  styles.feedRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: 12 * radius,
                    paddingHorizontal: 12 * spacing,
                    paddingVertical: 11 * spacing,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, color: colors.text, fontSize: 13.5 * font, marginRight: 8 * spacing }}
                >
                  {t.petGain(record.satietyGain, record.expGain)}
                </Text>
                {(record.levelUp || record.stageUp) && (
                  <Ionicons
                    name="arrow-up-circle"
                    size={15 * font}
                    color={colors.accent}
                    style={{ marginRight: 4 * spacing }}
                  />
                )}
                <Text style={{ color: colors.textTertiary, fontSize: 11.5 * font }}>{record.dateLabel}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 喂食弹层 */}
      <Modal visible={feedOpen} transparent animationType="slide" onRequestClose={() => setFeedOpen(false)}>
        <View style={styles.modalMask}>
          <View
            style={{
              // 高度交给内容决定，只设上限：1~3 项时贴合内容，不留大片空白
              maxHeight: sheetMaxHeight,
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20 * radius,
              borderTopRightRadius: 20 * radius,
              paddingHorizontal: 16 * spacing,
              paddingTop: 16 * spacing,
              paddingBottom: 16 * spacing,
            }}
          >
            <View style={styles.rowBetween}>
              <Text style={{ color: colors.text, fontSize: 16 * font, fontWeight: '700' }}>
                {t.petBackpackTitle}
              </Text>
              <TouchableOpacity onPress={() => setFeedOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={20 * font} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              // 列表高度显式算出来：1~3 项贴合内容，超出 3 项固定 3 行高并内部滚动；
              // maxHeight 保证小屏/横屏下先压缩列表，喂食数量与按钮始终可见
              style={{
                flexShrink: 1,
                height: foodListHeight,
                maxHeight: foodListMaxHeight,
                marginTop: 12 * spacing,
                marginBottom: 4 * spacing,
              }}
              showsVerticalScrollIndicator={false}
            >

            {(data?.backpack ?? []).length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13 * font, marginTop: 16 * spacing }}>
                {t.petBackpackEmpty}
              </Text>
            ) : (
              <View style={{ gap: foodRowGap }}>
                {(data?.backpack ?? []).map((food: PetBackpackItem, index: number) => {
                  const active = food.foodType === selectedFood;
                  const disabled = food.quantity <= 0;
                  return (
                    <TouchableOpacity
                      key={food.foodType}
                      disabled={disabled}
                      onPress={() => {
                        setSelectedFood(food.foodType);
                        setQuantity(1);
                        setFeedResult(null);
                        setFeedError(null);
                      }}
                      // 用第一行实测高度推算列表区高度（各行结构一致，高度相同）
                      onLayout={
                        index === 0
                          ? (event) => {
                              const next = Math.round(event.nativeEvent.layout.height);
                              if (next > 0 && next !== foodRowHeight) setFoodRowHeight(next);
                            }
                          : undefined
                      }
                      style={[
                        styles.foodRow,
                        {
                          borderColor: active ? colors.accent : colors.border,
                          backgroundColor: active ? colors.accentLight : colors.surfaceSecondary,
                          borderRadius: 12 * radius,
                          padding: 10 * spacing,
                          opacity: disabled ? 0.45 : 1,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 22 }}>{food.icon ?? '🍎'}</Text>
                      <View style={{ flex: 1, marginLeft: 8 * spacing }}>
                        <Text style={{ color: colors.text, fontSize: 13 * font, fontWeight: '600' }}>
                          {food.name}
                        </Text>
                        <Text style={{ color: colors.textTertiary, fontSize: 10.5 * font, marginTop: 2 * spacing }}>
                          {t.petGain(food.satiety, food.exp)} · {t.petFoodOwned(food.quantity)}
                        </Text>
                      </View>
                      {active && <Ionicons name="checkmark-circle" size={18 * font} color={colors.accent} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            </ScrollView>

            {selectedFood && (
              <View style={[styles.rowBetween, { marginTop: 14 * spacing, flexShrink: 0 }]}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 * font }}>{t.petFeedQuantity}</Text>
                <View style={[styles.rowGap, { gap: 10 * spacing }]}>
                  <TouchableOpacity
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                    style={[styles.stepButton, { borderColor: colors.border, borderRadius: 8 * radius }]}
                  >
                    <Ionicons name="remove" size={16 * font} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15 * font,
                      fontWeight: '700',
                      minWidth: 24,
                      textAlign: 'center',
                    }}
                  >
                    {quantity}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setQuantity((q) => Math.min(10, foodQuantity[selectedFood] ?? 10, q + 1))}
                    style={[styles.stepButton, { borderColor: colors.border, borderRadius: 8 * radius }]}
                  >
                    <Ionicons name="add" size={16 * font} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {feedResult && (
              <View style={{ marginTop: 12 * spacing }}>
                <Text style={{ color: colors.accentStrong, fontSize: 13 * font }}>
                  {t.petGain(feedResult.satietyGain, feedResult.expGain)}
                </Text>
                {feedResult.levelUp && (
                  <Text style={{ color: colors.textSecondary, fontSize: 12 * font, marginTop: 2 * spacing }}>
                    {t.petLevelUp(feedResult.level)}
                  </Text>
                )}
                {feedResult.stageUp && feedResult.evolution && (
                  <Text style={{ color: colors.textSecondary, fontSize: 12 * font, marginTop: 2 * spacing }}>
                    {t.petStageUp(feedResult.evolution.name)}
                  </Text>
                )}
              </View>
            )}

            {feedError && (
              <Text style={{ color: colors.error, fontSize: 12 * font, marginTop: 10 * spacing }}>{feedError}</Text>
            )}

            <TouchableOpacity
              disabled={!selectedFood || feeding}
              onPress={handleFeed}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: selectedFood && !feeding ? colors.accent : colors.border,
                  borderRadius: 12 * radius,
                  marginTop: 12 * spacing,
                  // 覆盖 primaryButton 的 flex:1，避免被弹层高度压缩导致文字被裁切
                  flexGrow: 0,
                  flexShrink: 0,
                  minHeight: 44,
                  height: 44,
                  // Modal 内读不到 safe-area inset，用最小间距兜底，避免底部按钮被系统导航栏遮挡
                  marginBottom: Math.max(insets.bottom, 36 * spacing),
                },
              ]}
            >
              {feeding ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={[styles.primaryButtonText, { color: selectedFood ? '#FFFFFF' : colors.textTertiary }]}>
                  {t.petFeedButton}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 养宠规则说明 */}
      <Modal visible={rulesOpen} transparent animationType="fade" onRequestClose={() => setRulesOpen(false)}>
        <TouchableOpacity
          style={styles.rulesMask}
          activeOpacity={1}
          onPress={() => setRulesOpen(false)}
        >
          <View
            style={[
              styles.rulesSheet,
              {
                backgroundColor: colors.surface,
                borderRadius: 16 * radius,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
              },
              cardShadow(isDark),
            ]}
          >
            <View style={[styles.rowBetween, { marginBottom: 12 * spacing }]}>
              <Text style={{ color: colors.text, fontSize: 16 * font, fontWeight: '700' }}>
                {t.petRulesTitle}
              </Text>
              <TouchableOpacity onPress={() => setRulesOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={20 * font} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {t.petRulesItems.map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', marginTop: idx > 0 ? 10 * spacing : 0 }}>
                <Text
                  style={{
                    color: colors.accent,
                    fontSize: 14 * font,
                    fontWeight: '700',
                    marginRight: 8 * spacing,
                    minWidth: 20,
                  }}
                >
                  {idx + 1}.
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 14 * font, fontWeight: '600' }}>
                    {item.title}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12.5 * font, marginTop: 3 * spacing, lineHeight: 18 }}>
                    {item.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  hero: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stateChip: {
    // 与名字同一行时垂直居中，避免 chip 顶到文字上方
    alignSelf: 'center',
  },
  // 舞台框：正方形区域，宠物居中，上下留白均衡、脚底不贴边
  stage: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stagePet: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageDash: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowGap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    overflow: 'hidden',
    marginTop: 6,
  },
  barFill: {
    height: '100%',
  },
  primaryButton: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  routeCard: {
    flex: 1,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  routeImage: {
    width: 64,
    height: 64,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  stepButton: {
    width: 28,
    height: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rulesMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  rulesSheet: {
    width: '100%',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
});

export default PetScreen;
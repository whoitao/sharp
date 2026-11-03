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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PetLottie, { type PetAnimationKind } from '../../components/PetLottie';
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

const PetScreen: React.FC<PetScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

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

  // Lottie：idle 循环；喂食/进化播一次后回到 idle
  const [animation, setAnimation] = useState<PetAnimationKind>('idle');
  const pendingEvolve = useRef(false);

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

  const foodQuantity = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of data?.backpack ?? []) map[item.foodType] = item.quantity;
    return map;
  }, [data?.backpack]);

  const hasFood = useMemo(
    () => (data?.backpack ?? []).some((item) => item.quantity > 0),
    [data?.backpack],
  );

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
      contentContainerStyle={{ paddingHorizontal: 16 * spacing, paddingBottom: 28 * spacing }}
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
        <View style={[styles.heroHeader, { gap: 8 * spacing }]}>
          <Text style={{ color: colors.text, fontSize: 18 * font, fontWeight: '700' }}>
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
        <Text style={{ color: colors.textTertiary, fontSize: 11.5 * font, marginTop: 2 * spacing }}>
          {pet.species.name} · {pet.growthStage.name} · {t.petCompanionDays(pet.companionDays)}
        </Text>

        <View style={styles.imageWrap}>
          {pet.growthStage.idleLottieUrl || pet.growthStage.imageUrl ? (
            <PetLottie
              kind={animation}
              idleUrl={pet.growthStage.idleLottieUrl}
              feedUrl={pet.growthStage.feedLottieUrl}
              evolveUrl={pet.growthStage.evolveLottieUrl}
              imageUrl={pet.growthStage.imageUrl}
              size={180}
              onFinish={handleAnimationFinish}
            />
          ) : (
            <Text style={{ fontSize: 64 }}>{pet.species.icon ?? '🐾'}</Text>
          )}
        </View>

        {/* 成长区 */}
        <View style={{ marginTop: 14 * spacing }}>
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textSecondary, fontSize: 11.5 * font }}>
              {pet.level >= pet.route[pet.route.length - 1]?.level && pet.expToNext === pet.experience
                ? t.petMaxLevel
                : t.petExpToNext(Math.max(0, pet.expToNext - pet.experience))}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: 11.5 * font }}>
              {pet.experience} / {pet.expToNext}
            </Text>
          </View>
          {renderProgress(expProgress, colors.accent)}
        </View>

        {/* 饱腹度 */}
        <View style={{ marginTop: 12 * spacing }}>
          <View style={styles.rowBetween}>
            <Text style={{ color: colors.textSecondary, fontSize: 11.5 * font }}>{t.petSatiety}</Text>
            <Text style={{ color: colors.textTertiary, fontSize: 11.5 * font }}>
              {pet.satiety} / {pet.satietyMax}
            </Text>
          </View>
          {renderProgress(satietyProgress, colors.warning)}
        </View>

        {/* 主操作 */}
        <View style={[styles.rowGap, { marginTop: 16 * spacing, gap: 10 * spacing }]}>
          <TouchableOpacity
            onPress={openFeed}
            disabled={!pet.canFeed}
            style={[
              styles.primaryButton,
              {
                backgroundColor: pet.canFeed ? colors.accent : colors.border,
                borderRadius: 12 * radius,
              },
            ]}
          >
            <Text style={[styles.primaryButtonText, { color: pet.canFeed ? '#FFFFFF' : colors.textTertiary }]}>
              {t.petFeedButton}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => (navigation as any).navigate('StudyTab', { screen: 'Study' })}
            style={[
              styles.secondaryButton,
              { borderColor: colors.border, borderRadius: 12 * radius },
            ]}
          >
            <Text style={{ color: colors.accentStrong, fontSize: 14 * font, fontWeight: '600' }}>
              {t.petGoPractice}
            </Text>
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
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 15 * font, marginBottom: 9 * spacing }]}>
          {t.petRouteTitle}
        </Text>
        <View style={[styles.rowGap, { gap: 8 * spacing }]}>
          {pet.route.map((stage) => {
            const active = stage.stageKey === pet.growthStage.key;
            return (
              <View
                key={stage.stageKey}
                style={[
                  styles.routeCard,
                  active ? cardShadow(isDark) : null,
                  {
                    backgroundColor: active ? colors.accentLight : colors.surface,
                    borderColor: active ? colors.accent : colors.border,
                    borderRadius: 12 * radius,
                    padding: 10 * spacing,
                  },
                ]}
              >
                {stage.imageUrl ? (
                  <Image source={{ uri: stage.imageUrl }} contentFit="contain" style={styles.routeImage} />
                ) : (
                  <Text style={{ fontSize: 28 }}>{pet.species.icon ?? '🐾'}</Text>
                )}
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 13 * font,
                    fontWeight: active ? '700' : '500',
                    marginTop: 4 * spacing,
                  }}
                >
                  {stage.name}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 10.5 * font, marginTop: 2 * spacing }}>
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
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: 20 * radius,
                borderTopRightRadius: 20 * radius,
                paddingHorizontal: 16 * spacing,
                paddingTop: 16 * spacing,
                // 预留系统导航栏安全区，避免底部按钮被手势条/导航栏遮挡
                paddingBottom: 16 * spacing + insets.bottom,
              },
            ]}
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
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingTop: 12 * spacing, paddingBottom: 4 * spacing }}
              showsVerticalScrollIndicator={false}
            >

            {(data?.backpack ?? []).length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13 * font, marginTop: 16 * spacing }}>
                {t.petBackpackEmpty}
              </Text>
            ) : (
              <View style={{ gap: 8 * spacing }}>
                {(data?.backpack ?? []).map((food: PetBackpackItem) => {
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

            {selectedFood && (
              <View style={[styles.rowBetween, { marginTop: 14 * spacing }]}>
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
            </ScrollView>

            <TouchableOpacity
              disabled={!selectedFood || feeding}
              onPress={handleFeed}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: selectedFood && !feeding ? colors.accent : colors.border,
                  borderRadius: 12 * radius,
                  marginTop: 12 * spacing,
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
    alignSelf: 'flex-start',
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  modalSheet: {
    maxHeight: '82%',
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
});

export default PetScreen;
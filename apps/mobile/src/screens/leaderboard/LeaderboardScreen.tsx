import { Image } from 'expo-image';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type {
  LeaderboardPeriod,
  QuizLeaderboardEntry,
  PetLeaderboardEntry,
  QuizLeaderboardResponse,
  PetLeaderboardResponse,
} from '@sharp/shared';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { LeaderboardStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import { cardShadow } from '../../theme/shadows';
import { formatCount } from '../../utils/format';

type NavigationProp = NativeStackNavigationProp<LeaderboardStackParamList, 'Leaderboard'>;

interface LeaderboardScreenProps {
  navigation: NavigationProp;
}

type Tab = 'quiz' | 'pet';

const PERIODS: LeaderboardPeriod[] = ['week', 'month', 'all'];

const RING_COLORS = ['#F59E0B', '#94A3B8', '#D97706'];
const RANK_LABELS = ['1ST', '2ND', '3RD'];

function AvatarCircle({
  src,
  name,
  size,
  ringColor,
  emoji,
  imageUri,
}: {
  src: string | null;
  name: string | null;
  size: number;
  ringColor?: string;
  emoji?: string | null;
  imageUri?: string | null;
}) {
  const { colors } = useTheme();
  const initials = (name ?? '?').slice(0, 1);
  const inset = ringColor ? 6 : 2;

  if (imageUri) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surface,
          borderWidth: ringColor ? 3 : 1,
          borderColor: ringColor ?? colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Image
          source={{ uri: imageUri }}
          style={{ width: size - inset, height: size - inset }}
          contentFit="contain"
        />
      </View>
    );
  }

  if (emoji) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surface,
          borderWidth: ringColor ? 3 : 1,
          borderColor: ringColor ?? colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: ringColor ? 3 : 1,
        borderColor: ringColor ?? colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {src ? (
        <Image source={src} style={{ width: size - inset, height: size - inset, borderRadius: (size - inset) / 2 }} contentFit="cover" />
      ) : (
        <Text style={{ color: colors.textSecondary, fontSize: size * 0.45, fontWeight: '500' }}>
          {initials}
        </Text>
      )}
    </View>
  );
}

function PodiumSpot({
  entry,
  displayRank,
  type,
}: {
  entry: QuizLeaderboardEntry | PetLeaderboardEntry;
  displayRank: number;
  type: Tab;
}) {
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();
  const isQuiz = type === 'quiz';
  const quizEntry = isQuiz ? (entry as QuizLeaderboardEntry) : null;
  const petEntry = !isQuiz ? (entry as PetLeaderboardEntry) : null;
  const idx = displayRank - 1;

  const value = isQuiz ? quizEntry!.totalQuestions : petEntry!.petExp;
  const unit = isQuiz ? t.lbQuestionsUnit : t.lbExpUnit;

  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          color: RING_COLORS[idx],
          fontSize: 12 * font,
          fontWeight: '700',
          letterSpacing: 1,
          marginBottom: 6 * spacing,
        }}
      >
        {RANK_LABELS[idx]}
      </Text>
      <AvatarCircle
        src={isQuiz ? entry.avatar : null}
        name={entry.nickname}
        size={displayRank === 1 ? 64 * spacing : 56 * spacing}
        ringColor={RING_COLORS[idx]}
        emoji={isQuiz ? null : petEntry!.petSpecies}
        imageUri={isQuiz ? null : petEntry!.petImageUrl}
      />
      <Text
        style={{
          color: colors.text,
          fontSize: 13 * font,
          fontWeight: '500',
          marginTop: 6 * spacing,
        }}
        numberOfLines={1}
      >
        {entry.nickname ?? '—'}
      </Text>
      <Text
        style={{
          color: colors.text,
          fontSize: 16 * font,
          fontWeight: '700',
          marginTop: 2 * spacing,
        }}
      >
        {formatCount(value)}{' '}
        <Text style={{ fontSize: 12 * font, fontWeight: '500', color: colors.textSecondary }}>
          {unit}
        </Text>
      </Text>
    </View>
  );
}

function MyRankCard({
  type,
  quizUser,
  petUser,
  gap,
}: {
  type: Tab;
  quizUser?: QuizLeaderboardEntry | null;
  petUser?: PetLeaderboardEntry | null;
  gap: number | null;
}) {
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();
  const isQuiz = type === 'quiz';
  const user = isQuiz ? quizUser : petUser;
  if (!user) return null;

  const petUser_ = !isQuiz ? (user as PetLeaderboardEntry) : null;
  const quizUser_ = isQuiz ? (user as QuizLeaderboardEntry) : null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12 * spacing,
        paddingVertical: 14 * spacing,
        paddingHorizontal: 16 * spacing,
        marginBottom: 12 * spacing,
        ...cardShadow(false),
      }}
    >
      <Text
        style={{
          color: colors.accent,
          fontSize: 32 * font,
          fontWeight: '800',
          marginRight: 14 * spacing,
        }}
      >
        #{user.rank}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 * font, marginBottom: 2 * spacing }}>
          {t.lbMyRank}
        </Text>
        <Text style={{ color: colors.text, fontSize: 15 * font, fontWeight: '600' }}>
          {isQuiz
            ? `${formatCount(quizUser_!.totalQuestions)} ${t.lbQuestionsUnit} · ${quizUser_!.accuracy}% ${t.lbAccuracyLabel}`
            : `${formatCount(petUser_!.petExp)} ${t.lbExpUnit} · ${t.lbLevel(petUser_!.petLevel)}`}
        </Text>
      </View>
      {gap != null && gap > 0 && (
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: colors.text, fontSize: 13 * font, fontWeight: '600' }}>
            {isQuiz ? t.lbGapToNext(gap, user.rank - 1) : t.lbGapToNextPet(gap, user.rank - 1)}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 * font, marginTop: 2 * spacing }}>
            {t.lbGapToNextRank(user.rank - 1)}
          </Text>
        </View>
      )}
    </View>
  );
}

function QuizRow({ entry }: { entry: QuizLeaderboardEntry }) {
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12 * spacing,
        paddingVertical: 12 * spacing,
        paddingHorizontal: 14 * spacing,
        marginBottom: 8 * spacing,
        ...cardShadow(false),
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 16 * font,
          fontWeight: '700',
          width: 24 * spacing,
        }}
      >
        {entry.rank}
      </Text>
      <AvatarCircle src={entry.avatar} name={entry.nickname} size={40 * spacing} />
      <View style={{ flex: 1, marginLeft: 10 * spacing }}>
        <Text style={{ color: colors.text, fontSize: 15 * font, fontWeight: '600' }} numberOfLines={1}>
          {entry.nickname ?? '—'}
        </Text>
        {entry.gradeName && (
          <Text style={{ color: colors.textTertiary, fontSize: 12 * font, marginTop: 1 * spacing }}>
            {entry.gradeName}
          </Text>
        )}
      </View>
      <Text style={{ color: colors.text, fontSize: 18 * font, fontWeight: '700' }}>
        {formatCount(entry.totalQuestions)}
        <Text style={{ fontSize: 12 * font, fontWeight: '500', color: colors.textSecondary }}> {t.lbQuestionsUnit}</Text>
      </Text>
    </View>
  );
}

function PetRow({ entry }: { entry: PetLeaderboardEntry }) {
  const { colors } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12 * spacing,
        paddingVertical: 12 * spacing,
        paddingHorizontal: 14 * spacing,
        marginBottom: 8 * spacing,
        ...cardShadow(false),
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 16 * font,
          fontWeight: '700',
          width: 24 * spacing,
        }}
      >
        {entry.rank}
      </Text>
      <AvatarCircle src={null} name={entry.nickname} size={40 * spacing} emoji={entry.petSpecies} imageUri={entry.petImageUrl} />
      <View style={{ flex: 1, marginLeft: 10 * spacing }}>
        <Text style={{ color: colors.text, fontSize: 15 * font, fontWeight: '600' }} numberOfLines={1}>
          {entry.nickname ?? '—'}
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: 12 * font, marginTop: 1 * spacing }}>
          {entry.petName ?? 'Pet'} · {t.lbLevel(entry.petLevel)}
        </Text>
      </View>
      <Text style={{ color: colors.text, fontSize: 18 * font, fontWeight: '700' }}>
        {formatCount(entry.petExp)}
        <Text style={{ fontSize: 12 * font, fontWeight: '500', color: colors.textSecondary }}> {t.lbExpUnit}</Text>
      </Text>
    </View>
  );
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = () => {
  const { colors, isDark } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('quiz');
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState<QuizLeaderboardResponse | null>(null);
  const [petData, setPetData] = useState<PetLeaderboardResponse | null>(null);

  const loadData = useCallback(async (currentTab: Tab, currentPeriod: LeaderboardPeriod) => {
    setLoading(true);
    try {
      if (currentTab === 'quiz') {
        const data = await api.getQuizLeaderboard(currentPeriod);
        setQuizData(data);
      } else {
        const data = await api.getPetLeaderboard(currentPeriod);
        setPetData(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(tab, period);
  }, [tab, period, loadData]);

  const entries = tab === 'quiz' ? quizData?.entries ?? [] : petData?.entries ?? [];
  const currentUser = tab === 'quiz' ? quizData?.currentUser : petData?.currentUser;
  const nextRankGap = tab === 'quiz' ? quizData?.nextRankGap : petData?.nextRankGap;
  const visible = entries.slice(0, 10);
  const top3 = visible.slice(0, 3);
  const rest = visible.slice(3);

  const periodLabel = (p: LeaderboardPeriod) =>
    p === 'week' ? t.lbWeek : p === 'month' ? t.lbMonth : t.lbAll;

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      {/* Tab toggle */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderRadius: 12 * spacing,
          marginHorizontal: 16 * spacing,
          marginTop: 0,
          marginBottom: 12 * spacing,
          padding: 4 * spacing,
        }}
      >
        {(['quiz', 'pet'] as Tab[]).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setTab(p)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6 * spacing,
              paddingVertical: 10 * spacing,
              borderRadius: 10 * spacing,
              backgroundColor: colors.surface,
              borderWidth: tab === p ? StyleSheet.hairlineWidth : 0,
              borderColor: colors.border,
              ...(tab === p ? cardShadow(isDark) : null),
            }}
          >
            <Text style={{ fontSize: 16 * font }}>
              {p === 'quiz' ? '📋' : '🐾'}
            </Text>
            <Text
              style={{
                color: tab === p ? colors.text : colors.textSecondary,
                fontSize: 15 * font,
                fontWeight: '600',
              }}
            >
              {p === 'quiz' ? t.lbQuizTab : t.lbPetTab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Period filter */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16 * spacing, gap: 8 * spacing, marginBottom: 16 * spacing }}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriod(p)}
            style={{
              paddingHorizontal: 16 * spacing,
              paddingVertical: 6 * spacing,
              borderRadius: 8 * spacing,
              borderWidth: 1,
              borderColor: period === p ? colors.accent : colors.border,
              backgroundColor: period === p ? colors.accentLight : 'transparent',
            }}
          >
            <Text
              style={{
                color: period === p ? colors.accentStrong : colors.textSecondary,
                fontSize: 14 * font,
                fontWeight: period === p ? '600' : '400',
              }}
            >
              {periodLabel(p)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary, fontSize: 15 * font }}>{t.lbEmpty}</Text>
        </View>
      ) : (
        <FlatList
          data={rest as (QuizLeaderboardEntry | PetLeaderboardEntry)[]}
          keyExtractor={(item) => item.userId}
          ListHeaderComponent={
            <View>
              {/* My Rank card */}
              <MyRankCard
                type={tab}
                quizUser={tab === 'quiz' ? (currentUser as unknown as QuizLeaderboardEntry | null) : null}
                petUser={tab === 'pet' ? (currentUser as unknown as PetLeaderboardEntry | null) : null}
                gap={nextRankGap ?? null}
              />

              {top3.length > 0 && (
                <View style={{ marginBottom: 8 * spacing }}>
                  {/* Podium: mint background card */}
                  <View
                    style={{
                      backgroundColor: colors.accentLight,
                      borderRadius: 16 * spacing,
                      paddingVertical: 20 * spacing,
                      paddingHorizontal: 12 * spacing,
                      marginBottom: 20 * spacing,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-end' }}>
                      {top3.length === 3 ? (
                        <>
                          <PodiumSpot entry={top3[1]} displayRank={2} type={tab} />
                          <View style={{ marginBottom: 12 * spacing }}>
                            <PodiumSpot entry={top3[0]} displayRank={1} type={tab} />
                          </View>
                          <PodiumSpot entry={top3[2]} displayRank={3} type={tab} />
                        </>
                      ) : (
                        top3.map((entry, idx) => (
                          <PodiumSpot key={idx} entry={entry} displayRank={idx + 1} type={tab} />
                        ))
                      )}
                    </View>
                  </View>

                  {/* Full ranking header */}
                  <Text style={{ color: colors.text, fontSize: 16 * font, fontWeight: '700', marginBottom: 12 * spacing }}>
                    {t.lbFullRanking}
                  </Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) =>
            tab === 'quiz' ? (
              <QuizRow entry={item as unknown as QuizLeaderboardEntry} />
            ) : (
              <PetRow entry={item as unknown as PetLeaderboardEntry} />
            )
          }
          contentContainerStyle={{
            paddingHorizontal: 16 * spacing,
            paddingBottom: 80 * spacing,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LeaderboardScreen;

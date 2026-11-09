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

function AvatarCircle({
  src,
  name,
  size,
}: {
  src: string | null;
  name: string | null;
  size: number;
}) {
  const { colors } = useTheme();
  const { font } = useDensity();
  const initials = (name ?? '?').slice(0, 1);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {src ? (
        <Image source={src} style={{ width: size, height: size }} contentFit="cover" />
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

  const value = isQuiz ? quizEntry!.totalQuestions : petEntry!.petExp;
  const unit = isQuiz ? t.lbQuestions(value) : t.lbExp(value);

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text
        style={{
          color: colors.text,
          fontSize: 18 * font,
          fontWeight: '700',
          marginBottom: 2 * spacing,
        }}
      >
        {formatCount(value)}{' '}
        <Text style={{ fontSize: 13 * font, fontWeight: '500', color: colors.textSecondary }}>
          {unit}
        </Text>
      </Text>
      <AvatarCircle src={entry.avatar} name={entry.nickname} size={40 * spacing} />
      <Text
        style={{
          color: colors.text,
          fontSize: 13 * font,
          fontWeight: '500',
          marginTop: 4 * spacing,
        }}
        numberOfLines={1}
      >
        {entry.nickname ?? '—'}
      </Text>
    </View>
  );
}

function QuizRow({ entry }: { entry: QuizLeaderboardEntry }) {
  const { colors } = useTheme();
  const { spacing, font } = useDensity();

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
        <Text style={{ fontSize: 12 * font, fontWeight: '500', color: colors.textSecondary }}> 题</Text>
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
      <AvatarCircle src={entry.avatar} name={entry.nickname} size={40 * spacing} />
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
        <Text style={{ fontSize: 12 * font, fontWeight: '500', color: colors.textSecondary }}> EXP</Text>
      </Text>
    </View>
  );
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = () => {
  const { colors, isDark } = useTheme();
  const { spacing, font } = useDensity();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('quiz');
  const [period, setPeriod] = useState<LeaderboardPeriod>('month');
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
        const data = await api.getPetLeaderboard();
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
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

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
              // 参考设计图：选中态是白色浮起胶囊（描边 + 阴影），不做绿色填充
              backgroundColor: colors.surface,
              borderWidth: tab === p ? StyleSheet.hairlineWidth : 0,
              borderColor: colors.border,
              ...(tab === p ? cardShadow(isDark) : null),
            }}
          >
            <Text style={{ fontSize: 16 * font }}>
              {p === 'quiz' ? '📋' : '🌿'}
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
              borderRadius: 20 * spacing,
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
            top3.length > 0 ? (
              <View style={{ paddingHorizontal: 16 * spacing, marginBottom: 8 * spacing }}>
                {/* Podium: 2nd, 1st, 3rd */}
                <View style={{ flexDirection: 'row', marginBottom: 20 * spacing }}>
                  {top3.length === 3 ? (
                    <>
                      <PodiumSpot entry={top3[1]} displayRank={2} type={tab} />
                      <PodiumSpot entry={top3[0]} displayRank={1} type={tab} />
                      <PodiumSpot entry={top3[2]} displayRank={3} type={tab} />
                    </>
                  ) : (
                    top3.map((entry, idx) => (
                      <PodiumSpot key={idx} entry={entry} displayRank={idx + 1} type={tab} />
                    ))
                  )}
                </View>

                {/* Full ranking header */}
                <Text style={{ color: colors.text, fontSize: 16 * font, fontWeight: '700', marginBottom: 12 * spacing }}>
                  {t.lbFullRanking}
                </Text>
              </View>
            ) : null
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

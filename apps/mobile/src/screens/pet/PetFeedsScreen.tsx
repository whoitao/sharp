import { Ionicons } from '@expo/vector-icons';
import type { PetFeedRecord } from '@sharp/shared';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import { api } from '../../services/api';

const FOOD_ICON: Record<string, string> = {
  normal: '🍎',
  premium: '🍖',
  rare: '🍰',
};

const PetFeedsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();

  const [records, setRecords] = useState<PetFeedRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (nextPage: number) => {
    if (nextPage === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const result = await api.getPetFeeds(nextPage);
      setRecords((prev) => (nextPage === 1 ? result.data : [...prev, ...result.data]));
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch {
      if (nextPage === 1) setRecords([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      data={records}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: 16 * spacing, paddingTop: 0, paddingBottom: 32 * spacing }}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (!loadingMore && page < totalPages) load(page + 1);
      }}
      ListEmptyComponent={
        <Text style={{ color: colors.textSecondary, fontSize: 13 * font, textAlign: 'center', marginTop: 24 * spacing }}>
          {t.petNoFeeds}
        </Text>
      }
      ListFooterComponent={
        loadingMore ? <ActivityIndicator color={colors.accent} style={{ marginTop: 12 * spacing }} /> : null
      }
      renderItem={({ item }) => (
        <View
          style={[
            styles.row,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 14 * radius,
              padding: 12 * spacing,
              marginBottom: 8 * spacing,
            },
          ]}
        >
          <Text style={{ fontSize: 24 }}>{FOOD_ICON[item.foodType] ?? '🍎'}</Text>
          <View style={{ flex: 1, marginLeft: 10 * spacing }}>
            <Text style={{ color: colors.text, fontSize: 13 * font, fontWeight: '600' }}>
              {t.petGain(item.satietyGain, item.expGain)}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: 11 * font, marginTop: 2 * spacing }}>
              {item.dateLabel} · ×{item.quantity}
            </Text>
          </View>
          {(item.levelUp || item.stageUp) && (
            <Ionicons name="arrow-up-circle" size={18 * font} color={colors.accent} />
          )}
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default PetFeedsScreen;

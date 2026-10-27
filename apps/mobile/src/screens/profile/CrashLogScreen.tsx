import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { CrashEntry } from '../../utils/crashLog';
import { clearCrashes, readCrashes } from '../../utils/crashLog';

const keyExtractor = (item: CrashEntry) => item.at;

const pad = (num: number) => num.toString().padStart(2, '0');

const formatCrashTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

interface CrashCardProps {
  item: CrashEntry;
  expanded: boolean;
  onToggle: (at: string) => void;
}

const CrashCard = React.memo(({ item, expanded, onToggle }: CrashCardProps) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: 14 * radius,
          padding: 16 * spacing,
          marginBottom: 12 * spacing,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.scope, { color: colors.accent, fontSize: 14 * font }]}>{item.scope}</Text>
        <Text style={[styles.time, { color: colors.textTertiary, fontSize: 12 * font }]}>
          {formatCrashTime(item.at)}
        </Text>
      </View>
      <Text
        style={[styles.message, { color: colors.text, fontSize: 14 * font, marginTop: 8 * spacing }]}
        numberOfLines={expanded ? undefined : 2}
      >
        {item.message}
      </Text>
      {expanded && !!item.stack && (
        <Text
          selectable
          numberOfLines={24}
          style={[
            styles.stack,
            {
              backgroundColor: colors.background,
              borderRadius: 10 * radius,
              padding: 12 * spacing,
              marginTop: 10 * spacing,
              color: colors.textSecondary,
              fontSize: 11 * font,
              lineHeight: 16 * font,
            },
          ]}
        >
          {item.stack}
        </Text>
      )}
      <Pressable
        style={{ paddingVertical: 8 * spacing }}
        onPress={() => onToggle(item.at)}
        accessibilityRole="button"
      >
        <Text style={{ color: colors.textSecondary, fontSize: 13 * font }}>
          {expanded ? t.crashHideDetails : t.crashDetails}
        </Text>
      </Pressable>
    </View>
  );
});

CrashCard.displayName = 'CrashCard';

const CrashLogScreen: React.FC = () => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const [entries, setEntries] = useState<CrashEntry[]>([]);
  const [expandedAt, setExpandedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    setEntries(await readCrashes());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const handleClear = useCallback(() => {
    Alert.alert(t.crashLogTitle, t.crashLogClearConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.confirm,
        style: 'destructive',
        onPress: () => {
          setExpandedAt(null);
          void clearCrashes().then(load);
        },
      },
    ]);
  }, [load, t.cancel, t.confirm, t.crashLogClearConfirm, t.crashLogTitle]);

  const toggleExpand = useCallback((at: string) => {
    setExpandedAt((prev) => (prev === at ? null : at));
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: CrashEntry }) => (
      <CrashCard item={item} expanded={expandedAt === item.at} onToggle={toggleExpand} />
    ),
    [expandedAt, toggleExpand]
  );

  const header = useMemo(
    () => (
      <View style={{ marginBottom: 16 * spacing }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 * font, lineHeight: 19 * font }}>
          {t.crashLogDesc}
        </Text>
        {entries.length > 0 && (
          <TouchableOpacity
            style={[
              styles.clearButton,
              {
                borderColor: colors.errorLight,
                borderRadius: 10 * radius,
                paddingVertical: 10 * spacing,
                marginTop: 12 * spacing,
              },
            ]}
            onPress={handleClear}
            activeOpacity={0.8}
          >
            <Text style={{ color: colors.error, fontSize: 14 * font, fontWeight: '600' }}>{t.crashLogClear}</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [colors, entries.length, font, handleClear, radius, spacing, t.crashLogClear, t.crashLogDesc]
  );

  const contentContainerStyle = useMemo(
    () => ({ padding: 16, paddingTop: 0, paddingBottom: 80 }),
    []
  );

  const listEmptyComponent = useMemo(
    () => (
      <Text style={{ color: colors.textTertiary, fontSize: 15 * font, textAlign: 'center', marginTop: 40 * spacing }}>
        {t.crashLogEmpty}
      </Text>
    ),
    [colors.textTertiary, font, spacing, t.crashLogEmpty]
  );

  const refreshControl = useMemo(
    () => <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />,
    [colors.accent, handleRefresh, isRefreshing]
  );

  return (
    <FlatList
      style={[styles.container, { backgroundColor: 'transparent' }]}
      data={entries}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={listEmptyComponent}
      contentContainerStyle={contentContainerStyle}
      refreshControl={refreshControl}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scope: {
    fontWeight: '600',
  },
  time: {
    fontVariant: ['tabular-nums'],
  },
  message: {
    lineHeight: 20,
  },
  stack: {
    overflow: 'hidden',
  },
  clearButton: {
    borderWidth: 1,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
  },
});

export default CrashLogScreen;

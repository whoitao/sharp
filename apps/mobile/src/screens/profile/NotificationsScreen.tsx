import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useDensity } from '../../hooks/useDensity';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import { api, type NotificationItem } from '../../services/api';
import type { ThemeColors } from '../../theme/colors';
import {
  formatNotificationTime,
  NOTIFICATION_TYPE_META,
} from '../../utils/notifications';

const PAGE_SIZE = 20;

type Filter = 'all' | 'unread';
type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Notifications'>;

interface NotificationsScreenProps {
  navigation: NavigationProp;
}

interface NotificationCardProps {
  item: NotificationItem;
  colors: ThemeColors;
  spacing: number;
  font: number;
  radius: number;
  typeLabel: string;
  timeLabel: string;
  onPress: (item: NotificationItem) => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  item,
  colors,
  spacing,
  font,
  radius,
  typeLabel,
  timeLabel,
  onPress,
}) => {
  const meta = NOTIFICATION_TYPE_META[item.type] ?? NOTIFICATION_TYPE_META.system;
  const unread = !item.isRead;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          borderRadius: 10 * radius,
          padding: 14 * spacing,
          marginBottom: 12 * spacing,
        },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={styles.cardRow}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: unread ? colors.accentLight : colors.background,
              width: 36 * spacing,
              height: 36 * spacing,
              borderRadius: 9 * radius,
              marginRight: 12 * spacing,
            },
          ]}
        >
          <Ionicons
            name={meta.icon}
            size={19 * font}
            color={unread ? colors.accentStrong : colors.textTertiary}
          />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                {
                  color: unread ? colors.text : colors.textSecondary,
                  fontSize: 15 * font,
                  fontWeight: unread ? '600' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {unread && (
              <View
                style={[
                  styles.unreadDot,
                  { backgroundColor: colors.accent, marginLeft: 6 * spacing },
                ]}
              />
            )}
          </View>

          <Text
            style={[
              styles.body,
              { color: colors.textSecondary, fontSize: 13 * font, marginTop: 3 * spacing },
            ]}
            numberOfLines={2}
          >
            {item.body}
          </Text>

          <Text
            style={[
              styles.metaText,
              { color: colors.textTertiary, fontSize: 12 * font, marginTop: 7 * spacing },
            ]}
            numberOfLines={1}
          >
            {timeLabel} · {typeLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();

  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [readAllPending, setReadAllPending] = useState(false);
  const [readAllFailed, setReadAllFailed] = useState(false);
  const mountedRef = useRef(true);
  const readAllErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (readAllErrorTimerRef.current) clearTimeout(readAllErrorTimerRef.current);
    };
  }, []);

  const load = useCallback(
    async (targetPage: number, append: boolean, targetFilter: Filter = filter) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const data = await api.getNotifications({
          filter: targetFilter,
          page: targetPage,
          pageSize: PAGE_SIZE,
        });
        if (!mountedRef.current) return;
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setPage(data.page);
        setUnreadCount(data.unreadCount);
        setLoadFailed(false);
      } catch {
        if (!mountedRef.current) return;
        if (!append) {
          setItems([]);
          setTotal(0);
          setLoadFailed(true);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [filter],
  );

  // 进入页面与从详情返回都刷新第一页：已读状态、未读数与未读筛选保持同步
  useFocusEffect(
    useCallback(() => {
      void load(1, false);
    }, [load]),
  );

  const handleSwitchFilter = useCallback(
    (next: Filter) => {
      if (next === filter) return;
      setFilter(next);
      setItems([]);
      setTotal(0);
      void load(1, false, next);
    },
    [filter, load],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(1, false);
  }, [load]);

  const onEndReached = useCallback(() => {
    if (loadingMore || loading || items.length >= total) return;
    void load(page + 1, true);
  }, [loadingMore, loading, items.length, total, page, load]);

  const handleReadAll = useCallback(async () => {
    if (readAllPending || unreadCount === 0) return;
    setReadAllPending(true);
    setReadAllFailed(false);
    try {
      await api.markAllNotificationsRead();
      if (!mountedRef.current) return;
      setUnreadCount(0);
      if (filter === 'unread') {
        setItems([]);
        setTotal(0);
      } else {
        setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      }
    } catch {
      if (!mountedRef.current) return;
      setReadAllFailed(true);
      if (readAllErrorTimerRef.current) clearTimeout(readAllErrorTimerRef.current);
      readAllErrorTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setReadAllFailed(false);
      }, 2400);
    } finally {
      if (mountedRef.current) setReadAllPending(false);
    }
  }, [readAllPending, unreadCount, filter]);

  // headerRight：全部已读（PRD FR-04，无需二次确认）
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => void handleReadAll()}
          disabled={readAllPending || unreadCount === 0}
          style={{ marginRight: 16, paddingVertical: 6, paddingHorizontal: 4 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t.notificationsMarkAllRead}
        >
          <Text
            style={{
              color: unreadCount > 0 ? colors.accentStrong : colors.textTertiary,
              fontSize: 14 * font,
              fontWeight: '600',
            }}
          >
            {t.notificationsMarkAllRead}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleReadAll, readAllPending, unreadCount, colors, font, t.notificationsMarkAllRead]);

  const handleOpen = useCallback(
    (item: NotificationItem) => {
      if (!item.isRead) {
        // 先写已读（服务端幂等），本地同步圆点与未读数，再进入详情
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id
              ? { ...row, isRead: true, readAt: new Date().toISOString() }
              : row,
          ),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
        void api.markNotificationRead(item.id).catch(() => null);
      }
      navigation.navigate('NotificationDetail', { id: item.id });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => {
      const meta = NOTIFICATION_TYPE_META[item.type] ?? NOTIFICATION_TYPE_META.system;
      return (
        <NotificationCard
          item={item}
          colors={colors}
          spacing={spacing}
          font={font}
          radius={radius}
          typeLabel={t[meta.labelKey]}
          timeLabel={formatNotificationTime(item.publishedAt, t)}
          onPress={handleOpen}
        />
      );
    },
    [colors, spacing, font, radius, t, handleOpen],
  );

  const listHeader = useMemo(
    () => (
      <View>
        <View
          style={[
            styles.filterBar,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderRadius: 8 * radius,
              padding: 2 * spacing,
              marginBottom: 12 * spacing,
            },
          ]}
        >
          {(['all', 'unread'] as Filter[]).map((value) => {
            const active = filter === value;
            const label =
              value === 'all'
                ? t.notificationsAll
                : unreadCount > 0
                  ? t.notificationsUnreadWithCount(unreadCount)
                  : t.notificationsUnread;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => handleSwitchFilter(value)}
                style={[
                  styles.filterSegment,
                  {
                    borderRadius: 6 * radius,
                    paddingVertical: 7 * spacing,
                    backgroundColor: active ? colors.surface : 'transparent',
                  },
                  active && styles.filterSegmentActive,
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={label}
              >
                <Text
                  style={{
                    color: active ? colors.accentStrong : colors.textSecondary,
                    fontSize: 13 * font,
                    fontWeight: active ? '600' : '500',
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {readAllFailed && (
          <Text style={{ color: colors.error, fontSize: 12 * font, marginBottom: 6 * spacing }}>
            {t.notificationsReadAllFailed}
          </Text>
        )}
      </View>
    ),
    [filter, unreadCount, readAllFailed, handleSwitchFilter, spacing, font, radius, colors, t],
  );

  const listEmpty = useMemo(() => {
    if (loading) return null;
    if (loadFailed) {
      return (
        <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
          <Ionicons
            name="cloud-offline-outline"
            size={44 * font}
            color={colors.accent}
            style={{ marginBottom: 12 * spacing }}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 16 * font }]}>
            {t.notificationsLoadFailed}
          </Text>
          <Text
            style={[
              styles.emptySub,
              { color: colors.textTertiary, fontSize: 14 * font, marginTop: 4 * spacing },
            ]}
          >
            {t.notificationsLoadFailedSub}
          </Text>
          <TouchableOpacity
            onPress={() => void load(1, false)}
            style={[
              styles.retryButton,
              {
                borderColor: colors.accent,
                marginTop: 16 * spacing,
                paddingHorizontal: 20 * spacing,
                paddingVertical: 8 * spacing,
                borderRadius: 999,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.accentStrong, fontSize: 14 * font, fontWeight: '600' }}>
              {t.notificationsRetry}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    const unreadFilter = filter === 'unread';
    return (
      <View style={[styles.empty, { paddingTop: 60 * spacing }]}>
        <Ionicons
          name={unreadFilter ? 'checkmark-done-outline' : 'notifications-outline'}
          size={44 * font}
          color={colors.accent}
          style={{ marginBottom: 12 * spacing }}
        />
        <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 16 * font }]}>
          {unreadFilter ? t.notificationsUnreadEmpty : t.notificationsEmpty}
        </Text>
        <Text
          style={[
            styles.emptySub,
            { color: colors.textTertiary, fontSize: 14 * font, marginTop: 4 * spacing },
          ]}
        >
          {unreadFilter ? t.notificationsUnreadEmptySub : t.notificationsEmptySub}
        </Text>
      </View>
    );
  }, [loading, loadFailed, filter, colors, spacing, font, t, load]);

  if (loading && items.length === 0 && !loadFailed) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: 16 * spacing,
            paddingTop: 0,
            paddingBottom: 24 * spacing,
          },
        ]}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 12 * spacing, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : items.length > 0 && items.length < total ? (
            <View style={{ paddingVertical: 12 * spacing, alignItems: 'center' }}>
              <Text style={{ color: colors.textTertiary, fontSize: 12 * font }}>
                {t.notificationsLoadMore}
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 24,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  filterSegment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSegmentActive: {
    shadowColor: '#10231A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#10231A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flexShrink: 1,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  body: {
    lineHeight: 19,
  },
  metaText: {
    lineHeight: 16,
  },
  empty: {
    alignItems: 'center',
  },
  emptyText: {
    fontWeight: '600',
  },
  emptySub: {
    textAlign: 'center',
  },
  retryButton: {
    borderWidth: 1,
    alignItems: 'center',
  },
});

export default NotificationsScreen;

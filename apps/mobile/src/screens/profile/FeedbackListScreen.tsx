import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import {
  api,
  type FeedbackCategory,
  type FeedbackListItem,
  type FeedbackStatus,
} from '../../services/api';
import type { ThemeColors } from '../../theme/colors';
import { formatNotificationTime } from '../../utils/notifications';

const PAGE_SIZE = 20;

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Feedback'>;
type LoadStatus = 'loading' | 'ready' | 'error';

interface FeedbackListScreenProps {
  navigation: NavigationProp;
}

const STATUS_LABEL_KEY: Record<FeedbackStatus, 'feedbackStatusPending' | 'feedbackStatusReplied' | 'feedbackStatusClosed'> = {
  pending: 'feedbackStatusPending',
  replied: 'feedbackStatusReplied',
  closed: 'feedbackStatusClosed',
};

const CATEGORY_LABEL_KEY: Record<
  FeedbackCategory,
  | 'feedbackCatBug'
  | 'feedbackCatSuggestion'
  | 'feedbackCatContent'
  | 'feedbackCatAccount'
  | 'feedbackCatOther'
> = {
  bug: 'feedbackCatBug',
  suggestion: 'feedbackCatSuggestion',
  content: 'feedbackCatContent',
  account: 'feedbackCatAccount',
  other: 'feedbackCatOther',
};

const FeedbackListScreen: React.FC<FeedbackListScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();

  const [items, setItems] = useState<FeedbackListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const load = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setStatus('loading');
      }
      try {
        const data = await api.listFeedback(targetPage, PAGE_SIZE);
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setPage(data.page);
        setTotal(data.total);
        setStatus('ready');
      } catch {
        if (!append) {
          setItems([]);
          setStatus('error');
        }
      } finally {
        if (append) {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  // 提交入口只保留导航栏右上角「+」，点击区域 40×40（外加 hitSlop）
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('FeedbackCompose')}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={t.feedbackNew}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.headerAdd}
        >
          <Ionicons name="add" size={24 * font} color={colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors.text, font, t.feedbackNew]);

  // 每次回到列表都刷新：从详情返回后红点应消失（服务端已在详情接口标记已读）
  useFocusEffect(
    useCallback(() => {
      void load(1, false);
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(1, false);
    setRefreshing(false);
  }, [load]);

  const statusChipStyle = (value: FeedbackStatus, themeColors: ThemeColors) => {
    if (value === 'replied') {
      return { backgroundColor: themeColors.accentLight, color: themeColors.accentStrong };
    }
    if (value === 'closed') {
      return { backgroundColor: themeColors.borderLight, color: themeColors.textTertiary };
    }
    return { backgroundColor: themeColors.surfaceSecondary, color: themeColors.textSecondary };
  };

  const renderItem = ({ item }: { item: FeedbackListItem }) => {
    const chip = statusChipStyle(item.status, colors);
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: item.hasUnreadReply ? colors.accent : colors.borderLight,
            borderRadius: 10 * radius,
            padding: 14 * spacing,
            marginBottom: 12 * spacing,
          },
        ]}
        onPress={() => navigation.navigate('FeedbackDetail', { id: item.id })}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.chip,
              {
                backgroundColor: chip.backgroundColor,
                borderRadius: 4 * radius,
                paddingHorizontal: 6 * spacing,
                paddingVertical: 2 * spacing,
              },
            ]}
          >
            <Text style={{ color: chip.color, fontSize: 11 * font, fontWeight: '600' }}>
              {t[STATUS_LABEL_KEY[item.status]]}
            </Text>
          </View>
          <Text style={{ color: colors.textTertiary, fontSize: 11 * font }}>
            {t[CATEGORY_LABEL_KEY[item.category] ?? 'feedbackCatOther']}
          </Text>
          {item.hasUnreadReply && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.accentLight }]}>
              <View style={[styles.unreadDot, { backgroundColor: '#EF4444' }]} />
              <Text
                style={{
                  color: colors.accentStrong,
                  fontSize: 10 * font,
                  fontWeight: '700',
                }}
              >
                {t.feedbackUnreadBadge}
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.summary,
            { color: colors.text, fontSize: 14 * font, marginTop: 6 * spacing },
          ]}
          numberOfLines={2}
        >
          {item.summary || '—'}
        </Text>

        <View style={[styles.footerRow, { marginTop: 8 * spacing }]}>
          <Text style={{ color: colors.textTertiary, fontSize: 11 * font }}>
            {formatNotificationTime(item.createdAt, t)}
          </Text>
          {item.replyCount > 0 && (
            <Text style={{ color: colors.textTertiary, fontSize: 11 * font }}>
              · {t.feedbackReplyCount(item.replyCount)}
            </Text>
          )}
          <Ionicons
            name="chevron-forward"
            size={14 * font}
            color={colors.textTertiary}
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (status === 'loading' && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.center, { paddingHorizontal: 24 * spacing }]}>
        <Ionicons
          name="cloud-offline-outline"
          size={44 * font}
          color={colors.accent}
          style={{ marginBottom: 12 * spacing }}
        />
        <Text style={{ color: colors.textSecondary, fontSize: 16 * font, fontWeight: '600' }}>
          {t.feedbackLoadFailed}
        </Text>
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 13 * font,
            marginTop: 4 * spacing,
            textAlign: 'center',
          }}
        >
          {t.feedbackLoadFailedSub}
        </Text>
        <TouchableOpacity
          onPress={() => void load(1, false)}
          activeOpacity={0.7}
          style={[
            styles.retryButton,
            { borderColor: colors.accent, marginTop: 16 * spacing, borderRadius: 999 },
          ]}
        >
          <Text style={{ color: colors.accentStrong, fontSize: 14 * font, fontWeight: '600' }}>
            {t.feedbackRetry}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: 16 * spacing, paddingTop: 12 * spacing, paddingBottom: 24 * spacing },
        // 空态在可视区域内垂直居中，避免只有顶部一小截内容
        items.length === 0 && styles.contentEmpty,
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={44 * font} color={colors.accent} />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 16 * font,
              fontWeight: '600',
              marginTop: 12 * spacing,
            }}
          >
            {t.feedbackEmpty}
          </Text>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 13 * font,
              marginTop: 4 * spacing,
              textAlign: 'center',
            }}
          >
            {t.feedbackEmptySub}
          </Text>
        </View>
      }
      ListFooterComponent={
        items.length > 0 && items.length < total ? (
          <TouchableOpacity
            onPress={() => void load(page + 1, true)}
            disabled={loadingMore}
            activeOpacity={0.7}
            style={[styles.loadMore, { borderColor: colors.border, borderRadius: 999 }]}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={{ color: colors.textSecondary, fontSize: 13 * font }}>
                {t.feedbackLoadMore}
              </Text>
            )}
          </TouchableOpacity>
        ) : null
      }
      onEndReachedThreshold={0.3}
      onEndReached={() => {
        if (items.length < total) void load(page + 1, true);
      }}
    />
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
  },
  contentEmpty: {
    justifyContent: 'center',
  },
  headerAdd: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  summary: {
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: 'auto',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  retryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  loadMore: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    marginTop: 4,
  },
});

export default FeedbackListScreen;

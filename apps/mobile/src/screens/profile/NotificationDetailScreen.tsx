import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useDensity } from '../../hooks/useDensity';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import {
  api,
  NotificationApiError,
  type NotificationItem,
} from '../../services/api';
import {
  formatNotificationTime,
  NOTIFICATION_TYPE_META,
} from '../../utils/notifications';

type LoadStatus = 'loading' | 'ready' | 'missing' | 'error';

type PageTarget =
  | {
      screen: 'Pet' | 'Favorites' | 'WrongQuestions' | 'Records' | 'Textbook' | 'Settings';
    }
  | { screen: 'ArticleDetail'; params: { id: string } };

interface NotificationDetailScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'NotificationDetail'>;
  route: RouteProp<ProfileStackParamList, 'NotificationDetail'>;
}

/** 站内页面路径 → 移动端路由（后端 actionValue 沿用 Web 路径） */
function resolvePageTarget(value: string | null): PageTarget | null {
  if (!value) return null;
  const [path] = value.split('?');
  const normalized = path.replace(/\/+$/, '') || '/';

  switch (normalized) {
    case '/account/pet':
    case '/pet':
      return { screen: 'Pet' };
    case '/account/favorites':
    case '/favorites':
      return { screen: 'Favorites' };
    case '/account/wrong-questions':
    case '/wrong-questions':
      return { screen: 'WrongQuestions' };
    case '/account/records':
    case '/records':
      return { screen: 'Records' };
    case '/account/textbook':
    case '/textbook':
      return { screen: 'Textbook' };
    case '/account/settings':
    case '/settings':
      return { screen: 'Settings' };
    default:
      break;
  }

  if (normalized.startsWith('/articles/')) {
    const id = normalized.slice('/articles/'.length);
    if (id) return { screen: 'ArticleDetail', params: { id } };
  }
  return null;
}

const NotificationDetailScreen: React.FC<NotificationDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const { id } = route.params;

  const [item, setItem] = useState<NotificationItem | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [invalidTarget, setInvalidTarget] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await api.getNotificationDetail(id);
      setItem(data);
      setStatus('ready');
      // 进入详情即标记已读（PRD FR-04），失败不阻塞阅读
      if (!data.isRead) {
        setItem({ ...data, isRead: true });
        void api.markNotificationRead(data.id).catch(() => null);
      }
    } catch (err) {
      // 详情接口对不可见/已过期消息返回 404，其余情况按加载失败处理
      setStatus(err instanceof NotificationApiError && err.status === 404 ? 'missing' : 'error');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const meta = item ? NOTIFICATION_TYPE_META[item.type] ?? NOTIFICATION_TYPE_META.system : null;

  const handleAction = useCallback(() => {
    if (!item) return;
    if (item.actionType === 'page') {
      const target = resolvePageTarget(item.actionValue);
      if (!target) {
        setInvalidTarget(true);
        return;
      }
      if (target.screen === 'ArticleDetail') {
        navigation.navigate('ArticleDetail', target.params);
      } else {
        navigation.navigate(target.screen);
      }
      return;
    }
    if (item.actionType === 'url') {
      if (/^https?:\/\//i.test(item.actionValue ?? '')) {
        void Linking.openURL(item.actionValue as string).catch(() => setInvalidTarget(true));
      } else {
        setInvalidTarget(true);
      }
    }
  }, [item, navigation]);

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (status !== 'ready' || !item || !meta) {
    return (
      <View style={[styles.center, { paddingHorizontal: 24 * spacing }]}>
        <Ionicons
          name="notifications-off-outline"
          size={44 * font}
          color={colors.accent}
          style={{ marginBottom: 12 * spacing }}
        />
        <Text style={{ color: colors.textSecondary, fontSize: 16 * font, fontWeight: '600' }}>
          {status === 'missing' ? t.notificationsExpired : t.notificationsLoadFailed}
        </Text>
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 14 * font,
            marginTop: 4 * spacing,
            textAlign: 'center',
          }}
        >
          {status === 'missing' ? t.notificationsExpiredBody : t.notificationsLoadFailedSub}
        </Text>
        <TouchableOpacity
          onPress={status === 'missing' ? () => navigation.goBack() : () => void load()}
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
            {status === 'missing' ? t.notificationsBackToList : t.notificationsRetry}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeLabel = t[meta.labelKey];
  // 消息保留 90 天（接口未返回 expireAt，与后端清理规则一致）
  const cleanupDays = item.publishedAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(item.publishedAt).getTime() + 90 * 86400000 - Date.now()) / 86400000,
        ),
      )
    : 90;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingHorizontal: 16 * spacing,
        // 与列表一致：卡片紧贴导航下方，不再额外留出顶部 padding
        paddingTop: 0,
        paddingBottom: 32 * spacing,
      }}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            borderRadius: 10 * radius,
            padding: 18 * spacing,
          },
        ]}
      >
        <Text style={{ color: colors.text, fontSize: 19 * font, fontWeight: '700' }}>
          {item.title}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 12 * font,
            marginTop: 6 * spacing,
          }}
        >
          {typeLabel} · {formatNotificationTime(item.publishedAt, t)}
        </Text>

        <Text
          style={{
            color: colors.text,
            fontSize: 15 * font,
            lineHeight: 24 * font,
            marginTop: 14 * spacing,
          }}
        >
          {item.body}
        </Text>

        {invalidTarget && (
          <Text
            style={{
              color: colors.error,
              fontSize: 12 * font,
              marginTop: 12 * spacing,
            }}
          >
            {t.notificationsExpired}
          </Text>
        )}

        {item.actionType !== 'none' && !!item.actionValue && (
          <TouchableOpacity
            onPress={handleAction}
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.accentStrong,
                marginTop: 18 * spacing,
                paddingHorizontal: 20 * spacing,
                paddingVertical: 11 * spacing,
                borderRadius: 8 * radius,
              },
            ]}
            activeOpacity={0.8}
          >
            <Text
              style={{
                color: isDark ? colors.background : colors.surface,
                fontSize: 14 * font,
                fontWeight: '600',
              }}
            >
              {t.notificationsGo}
            </Text>
          </TouchableOpacity>
        )}

        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 12 * font,
            marginTop: 16 * spacing,
          }}
        >
          {t.notificationsCleanupHint(cleanupDays)}
        </Text>
      </View>
    </ScrollView>
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
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#10231A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  actionButton: {
    alignSelf: 'flex-start',
  },
  retryButton: {
    borderWidth: 1,
    alignItems: 'center',
  },
});

export default NotificationDetailScreen;

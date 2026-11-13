import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import RichTextView from '../../components/RichTextView';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import {
  api,
  type FeedbackCategory,
  type FeedbackDetail,
  type FeedbackStatus,
} from '../../services/api';
import { formatNotificationTime } from '../../utils/notifications';

type LoadStatus = 'loading' | 'ready' | 'missing' | 'error';

const MAX_REPLY = 2000;

interface FeedbackDetailScreenProps {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'FeedbackDetail'>;
  route: RouteProp<ProfileStackParamList, 'FeedbackDetail'>;
}

const STATUS_LABEL_KEY: Record<
  FeedbackStatus,
  'feedbackStatusPending' | 'feedbackStatusReplied' | 'feedbackStatusClosed'
> = {
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

const FeedbackDetailScreen: React.FC<FeedbackDetailScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const { id } = route.params;

  const [detail, setDetail] = useState<FeedbackDetail | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      // 详情接口在存在未读回复时会同时标记已读，列表红点也会随之消失
      const data = await api.getFeedback(id);
      setDetail(data);
      setStatus('ready');
    } catch (err) {
      const httpStatus = (err as { status?: number }).status;
      setStatus(httpStatus === 404 ? 'missing' : 'error');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = useCallback(async () => {
    const content = reply.trim();
    if (!content || sending) return;
    setSending(true);
    setReplyError(null);
    try {
      await api.replyFeedback(id, content);
      setReply('');
      const data = await api.getFeedback(id);
      setDetail(data);
      setStatus('ready');
    } catch (err) {
      setReplyError(
        err instanceof Error && err.message ? err.message : t.feedbackReplyFailed,
      );
    } finally {
      setSending(false);
    }
  }, [id, reply, sending, t]);

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (status !== 'ready' || !detail) {
    return (
      <View style={[styles.center, { paddingHorizontal: 24 * spacing }]}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={44 * font}
          color={colors.accent}
          style={{ marginBottom: 12 * spacing }}
        />
        <Text style={{ color: colors.textSecondary, fontSize: 16 * font, fontWeight: '600' }}>
          {status === 'missing' ? t.feedbackNotFound : t.feedbackLoadFailed}
        </Text>
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: 13 * font,
            marginTop: 4 * spacing,
            textAlign: 'center',
          }}
        >
          {status === 'missing' ? t.feedbackEmptySub : t.feedbackLoadFailedSub}
        </Text>
        <TouchableOpacity
          onPress={() =>
            status === 'missing' ? navigation.goBack() : void load()
          }
          activeOpacity={0.7}
          style={[
            styles.outlineButton,
            { borderColor: colors.accent, marginTop: 16 * spacing, borderRadius: 999 },
          ]}
        >
          <Text style={{ color: colors.accentStrong, fontSize: 14 * font, fontWeight: '600' }}>
            {status === 'missing' ? t.feedbackBackToList : t.feedbackRetry}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const closed = detail.status === 'closed';
  const canSend = !closed && reply.trim().length > 0 && !sending;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingHorizontal: 16 * spacing,
          paddingTop: 12 * spacing,
          paddingBottom: 28 * spacing,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 用户提交的富文本正文：服务端已白名单清洗，RichTextView 再用 CSP nonce 隔离脚本 */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
              borderRadius: 10 * radius,
              padding: 14 * spacing,
            },
          ]}
        >
          <View style={styles.badgeRow}>
            <View
              style={{
                backgroundColor:
                  detail.status === 'replied'
                    ? colors.accentLight
                    : colors.surfaceSecondary,
                borderRadius: 4 * radius,
                paddingHorizontal: 6 * spacing,
                paddingVertical: 2 * spacing,
              }}
            >
              <Text
                style={{
                  color:
                    detail.status === 'replied'
                      ? colors.accentStrong
                      : colors.textSecondary,
                  fontSize: 11 * font,
                  fontWeight: '600',
                }}
              >
                {t[STATUS_LABEL_KEY[detail.status]]}
              </Text>
            </View>
            <Text style={{ color: colors.textTertiary, fontSize: 11 * font }}>
              {t[CATEGORY_LABEL_KEY[detail.category] ?? 'feedbackCatOther']}
            </Text>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 11 * font,
                marginLeft: 'auto',
              }}
            >
              {t.feedbackSubmittedAt(formatNotificationTime(detail.createdAt, t))}
            </Text>
          </View>

          <RichTextView
            html={detail.content}
            fontSize={14 * font}
            color={colors.text}
            lineHeight={Math.round(22 * font)}
            containerStyle={{ marginTop: 10 * spacing }}
          />
        </View>

        {detail.replies.length > 0 && (
          <View style={{ marginTop: 18 * spacing }}>
            <Text style={{ color: colors.text, fontSize: 14 * font, fontWeight: '700' }}>
              {t.feedbackConversation}
            </Text>
            {detail.replies.map((item) => {
              const isAdmin = item.authorType === 'admin';
              return (
                <View
                  key={item.id}
                  style={[
                    styles.replyCard,
                    {
                      backgroundColor: isAdmin ? colors.accentLight : colors.surface,
                      borderColor: isAdmin ? colors.accent : colors.borderLight,
                      borderRadius: 10 * radius,
                      padding: 12 * spacing,
                      marginTop: 10 * spacing,
                    },
                  ]}
                >
                  <View style={styles.badgeRow}>
                    <Text
                      style={{
                        color: isAdmin ? colors.accentStrong : colors.textSecondary,
                        fontSize: 11 * font,
                        fontWeight: '700',
                      }}
                    >
                      {isAdmin ? t.feedbackAdmin : t.feedbackYou}
                    </Text>
                    <Text style={{ color: colors.textTertiary, fontSize: 11 * font }}>
                      · {formatNotificationTime(item.createdAt, t)}
                    </Text>
                  </View>
                  {/* 回复/追问在服务端是纯文本（保留换行），不做 HTML 渲染 */}
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14 * font,
                      lineHeight: 21 * font,
                      marginTop: 6 * spacing,
                    }}
                  >
                    {item.content}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {closed ? (
          <View
            style={{
              backgroundColor: colors.surfaceSecondary,
              borderRadius: 10 * radius,
              padding: 12 * spacing,
              marginTop: 18 * spacing,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12 * font }}>
              {t.feedbackClosedHint}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                borderRadius: 10 * radius,
                padding: 12 * spacing,
                marginTop: 18 * spacing,
              },
            ]}
          >
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder={t.feedbackReplyPlaceholder}
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={MAX_REPLY}
              textAlignVertical="top"
              style={[
                styles.replyInput,
                {
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderColor: colors.borderLight,
                  borderRadius: 8 * radius,
                  fontSize: 14 * font,
                  paddingHorizontal: 10 * spacing,
                  paddingVertical: 8 * spacing,
                },
              ]}
            />
            {!!replyError && (
              <Text
                style={{
                  color: '#DC2626',
                  fontSize: 12 * font,
                  fontWeight: '600',
                  marginTop: 8 * spacing,
                }}
              >
                {replyError}
              </Text>
            )}
            <TouchableOpacity
              onPress={() => void send()}
              disabled={!canSend}
              activeOpacity={0.8}
              style={[
                styles.sendButton,
                {
                  backgroundColor: canSend ? colors.accent : colors.border,
                  borderRadius: 999,
                  marginTop: 10 * spacing,
                },
              ]}
              accessibilityRole="button"
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    color: canSend ? '#FFFFFF' : colors.textTertiary,
                    fontSize: 13 * font,
                    fontWeight: '600',
                  }}
                >
                  {sending ? t.feedbackSending : t.feedbackSendReply}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  replyCard: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  replyInput: {
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 72,
  },
  sendButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButton: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
});

export default FeedbackDetailScreen;

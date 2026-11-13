import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import React, { useCallback, useRef, useState } from 'react';
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
import FeedbackRichEditor, {
  type FeedbackRichEditorHandle,
} from '../../components/FeedbackRichEditor';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import { api, FeedbackApiError, type FeedbackCategory } from '../../services/api';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'FeedbackCompose'>;

interface FeedbackComposeScreenProps {
  navigation: NavigationProp;
}

// 与服务端 FEEDBACK_MIN_TEXT 保持一致（5 字），不要单独放宽，否则会被 CONTENT_TOO_SHORT 拒绝
const MIN_TEXT = 5;
const MAX_TEXT = 2000;
const MAX_CONTACT = 120;

const CATEGORIES: FeedbackCategory[] = ['bug', 'suggestion', 'content', 'account', 'other'];

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

/** 与服务端 htmlToText 口径一致：块级标签/换行折算成字符，再去标签、还原实体计长度 */
function plainTextLength(html: string): number {
  return html
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre|tr|figure|figcaption)>/gi, '$&\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim().length;
}

const FeedbackComposeScreen: React.FC<FeedbackComposeScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();

  const editorRef = useRef<FeedbackRichEditorHandle>(null);
  const [category, setCategory] = useState<FeedbackCategory>('other');
  const [contact, setContact] = useState('');
  const [html, setHtml] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textLength = plainTextLength(html);
  const minRemaining = Math.max(0, MIN_TEXT - textLength);
  const canSubmit = minRemaining === 0 && !submitting;

  const submit = useCallback(async () => {
    if (submitting) return;
    setError(null);

    const content = await editorRef.current?.getHtml();
    if (!content) return;
    const length = plainTextLength(content);
    if (length < MIN_TEXT) {
      setError(t.feedbackContentTooShort);
      return;
    }
    if (length > MAX_TEXT) {
      setError(t.feedbackContentTooLong);
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createFeedback({
        content,
        category,
        contact: contact.trim() || undefined,
        // 移动端只采集路由名，不采集 URL 参数，避免带出隐私信息
        pageContext: 'Profile',
        clientVersion: Constants.expoConfig?.version,
      });
      // 提交成功直接看详情，返回时回到列表（列表聚焦时会刷新）
      navigation.replace('FeedbackDetail', { id: created.id });
    } catch (err) {
      setError(
        err instanceof FeedbackApiError && err.message ? err.message : t.feedbackSubmitFailed,
      );
    } finally {
      setSubmitting(false);
    }
  }, [category, contact, navigation, submitting, t]);

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
        <Text style={{ color: colors.textSecondary, fontSize: 12 * font, fontWeight: '600' }}>
          {t.feedbackCategoryLabel}
        </Text>
        <View style={[styles.chips, { marginTop: 8 * spacing }]}>
          {CATEGORIES.map((value) => {
            const active = category === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setCategory(value)}
                activeOpacity={0.7}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? colors.accent : colors.border,
                    backgroundColor: active ? colors.accentLight : colors.surface,
                    borderRadius: 999,
                    paddingHorizontal: 12 * spacing,
                    paddingVertical: 6 * spacing,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? colors.accentStrong : colors.textSecondary,
                    fontSize: 12 * font,
                    fontWeight: '600',
                  }}
                >
                  {t[CATEGORY_LABEL_KEY[value]]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 12 * font,
            fontWeight: '600',
            marginTop: 18 * spacing,
          }}
        >
          {t.feedbackContentLabel}
        </Text>
        <View style={{ marginTop: 8 * spacing }}>
          <FeedbackRichEditor
            ref={editorRef}
            onChange={setHtml}
            height={Math.round(220 * spacing)}
          />
        </View>
        <Text
          style={{
            color: minRemaining > 0 ? '#D97706' : colors.textTertiary,
            fontSize: 11 * font,
            fontWeight: minRemaining > 0 ? '600' : '400',
            marginTop: 6 * spacing,
          }}
        >
          {textLength}/{MAX_TEXT}
          {minRemaining > 0
            ? ` · ${t.feedbackMinLengthTip}${
                textLength > 0 ? `，${t.feedbackMinLengthRemaining(minRemaining)}` : ''
              }`
            : ''}
        </Text>

        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 12 * font,
            fontWeight: '600',
            marginTop: 18 * spacing,
          }}
        >
          {t.feedbackContactLabel}
        </Text>
        <TextInput
          value={contact}
          onChangeText={setContact}
          maxLength={MAX_CONTACT}
          placeholder={t.feedbackContactPlaceholder}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.contactInput,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
              borderRadius: 10 * radius,
              fontSize: 14 * font,
              marginTop: 8 * spacing,
              paddingHorizontal: 12 * spacing,
              paddingVertical: 10 * spacing,
            },
          ]}
        />

        {!!error && (
          <Text
            style={{
              color: '#DC2626',
              fontSize: 12 * font,
              fontWeight: '600',
              marginTop: 12 * spacing,
            }}
          >
            {error}
          </Text>
        )}

        <TouchableOpacity
          onPress={() => void submit()}
          disabled={!canSubmit}
          activeOpacity={0.8}
          style={[
            styles.submitButton,
            {
              backgroundColor: canSubmit ? colors.accent : colors.border,
              borderRadius: 999,
              marginTop: 22 * spacing,
              paddingVertical: 13 * spacing,
            },
          ]}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ color: canSubmit ? '#FFFFFF' : colors.textTertiary, fontSize: 15 * font, fontWeight: '600' }}>
              {submitting ? t.feedbackSubmitting : t.feedbackSubmit}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  contactInput: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FeedbackComposeScreen;

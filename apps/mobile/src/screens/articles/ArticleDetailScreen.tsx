import { useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ArticleDetail } from '@sharp/shared';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import RichTextView from '../../components/RichTextView';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import { formatDate } from '../../utils/datetime';

type DetailRoute = RouteProp<HomeStackParamList, 'ArticleDetail'>;
type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'ArticleDetail'>;

interface ArticleDetailScreenProps {
  route: DetailRoute;
  navigation: NavigationProp;
}

/** 固定 YYYY-MM-DD（北京时间），避免不同端本地化格式不一致 */

const ArticleDetailScreen: React.FC<ArticleDetailScreenProps> = ({ route }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const articleId = route.params.id;
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 草稿/下线后再次打开会取不到内容，这里只渲染当前可见的文章
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      api
        .getArticleDetail(articleId)
        .then((data) => {
          if (active) setArticle(data);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [articleId]),
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 14 * font }}>{t.noData}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16 * spacing,
          paddingTop: 8 * spacing,
          paddingBottom: 32 * spacing,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 6 * radius,
              paddingHorizontal: 8 * spacing,
              paddingVertical: 2 * spacing,
            }}
          >
            <Text style={{ color: colors.accentStrong, fontSize: 11 * font, fontWeight: '600' }}>
              {article.categoryName}
            </Text>
          </View>
          <Text style={{ color: colors.textTertiary, fontSize: 11.5 * font }}>
            {formatDate(article.publishedAt)}
          </Text>
        </View>

        <Text
          style={{
            color: colors.text,
            fontSize: 20 * font,
            fontWeight: '700',
            lineHeight: 27 * font,
            marginTop: 12 * spacing,
          }}
        >
          {article.title}
        </Text>

        {article.summary ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13.5 * font,
              lineHeight: 20 * font,
              marginTop: 8 * spacing,
            }}
          >
            {article.summary}
          </Text>
        ) : null}

        <Text style={{ color: colors.textTertiary, fontSize: 11 * font, marginTop: 8 * spacing }}>
          {t.articleViews(article.viewCount)}
        </Text>

        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 12 * radius,
            padding: 14 * spacing,
            marginTop: 16 * spacing,
          }}
        >
          <RichTextView
            html={article.content}
            fontSize={14.5 * font}
            color={colors.text}
            lineHeight={23 * font}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

export default ArticleDetailScreen;

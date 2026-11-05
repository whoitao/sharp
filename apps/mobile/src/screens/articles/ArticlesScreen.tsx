import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ArticleListItem } from '@sharp/shared';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import { cardShadow } from '../../theme/shadows';
import { formatDate } from '../../utils/datetime';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Articles'>;

interface ArticlesScreenProps {
  navigation: NavigationProp;
}

/** 固定 YYYY-MM-DD（北京时间），避免不同端本地化格式不一致 */

const ArticlesScreen: React.FC<ArticlesScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const [items, setItems] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 每次回到列表都重新拉取，后台发布/下线后能及时反映
  useFocusEffect(
    useCallback(() => {
      let active = true;
      api
        .getArticles()
        .then((data) => {
          if (active) setItems(data.items);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16 * spacing,
          paddingTop: 8 * spacing,
          paddingBottom: 24 * spacing,
          gap: 10 * spacing,
        }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14 * font,
              marginTop: 24 * spacing,
              textAlign: 'center',
            }}
          >
            {t.articleEmpty}
          </Text>
        ) : (
          items.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('ArticleDetail', { id: item.id, title: item.title })
              }
              style={[
                cardShadow(isDark),
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderRadius: 12 * radius,
                  padding: 14 * spacing,
                },
              ]}
            >
              <View style={styles.metaRow}>
                <View
                  style={{
                    backgroundColor: colors.background,
                    borderRadius: 6 * radius,
                    paddingHorizontal: 8 * spacing,
                    paddingVertical: 2 * spacing,
                  }}
                >
                  <Text style={{ color: colors.accentStrong, fontSize: 11 * font, fontWeight: '600' }}>
                    {item.categoryName}
                  </Text>
                </View>
                <Text style={{ color: colors.textTertiary, fontSize: 11.5 * font }}>
                  {formatDate(item.publishedAt)}
                </Text>
              </View>

              <Text
                style={{
                  color: colors.text,
                  fontSize: 15 * font,
                  fontWeight: '600',
                  marginTop: 8 * spacing,
                  lineHeight: 20 * font,
                }}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              {item.summary ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12.5 * font,
                    lineHeight: 18 * font,
                    marginTop: 6 * spacing,
                  }}
                  numberOfLines={2}
                >
                  {item.summary}
                </Text>
              ) : null}

              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 11 * font,
                  marginTop: 10 * spacing,
                }}
              >
                {t.articleViews(item.viewCount)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

export default ArticlesScreen;

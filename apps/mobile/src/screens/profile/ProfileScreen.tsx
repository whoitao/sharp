import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { buildAvatarUrl } from '@sharp/shared';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import type { RootState } from '../../stores';

// 与 api.ts 的 API_BASE_URL 同款兜底：release 构建若未内联 .env 变量，process.env 里会是 undefined，
// 缺了它 buildAvatarUrl 只能返回 null，头像永远显示不出（安卓 APK 实测缺失）
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://faliyecwupijgmjbvzca.supabase.co';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

interface ProfileScreenProps {
  navigation: NavigationProp;
}

type MenuIcon = React.ComponentProps<typeof Ionicons>['name'];

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { publisherId, gradeId, subjectId } = useSelector((state: RootState) => state.settings);
  // 「我的教材」当前值文案需要的名称映射
  const [publisherName, setPublisherName] = useState<string | null>(null);
  const [gradeName, setGradeName] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.getPublishers().then((list) => {
        setPublisherName(list.find((publisher) => publisher.id === publisherId)?.name ?? null);
      });
      api.getGrades().then((list) => {
        setGradeName(list.find((grade) => grade.id === gradeId)?.name ?? null);
      });
      api.getSubjects().then((list) => {
        setSubjectName(list.find((subject) => subject.id === subjectId)?.name ?? null);
      });
    }, [publisherId, gradeId, subjectId])
  );

  const textbookLabel =
    (publisherId && gradeId
      ? [subjectName, publisherName, gradeName].filter(Boolean).join(' · ')
      : '') || t.textbookNotSet;

  // DB 里只存相对路径 {userId}/avatars/avatar.{ext}，展示层拼完整 URL
  // 兼容历史：如果 user.avatar 已是完整 https:// URL，buildAvatarUrl 原样返回
  const avatarUrl = useMemo(
    () => buildAvatarUrl(user?.avatar ?? null, SUPABASE_URL),
    [user?.avatar]
  );

  // 卡片层级靠"白底 + hairline"表达；深色下 elevation 会变成一圈黑边，关掉
  const userCardStyle = {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    elevation: isDark ? 0 : 4,
    shadowOpacity: isDark ? 0 : 0.08,
  };
  const listCardStyle = {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    elevation: isDark ? 0 : 2,
    shadowOpacity: isDark ? 0 : 0.04,
  };

  const menuItems: { label: string; value?: string; icon: MenuIcon; onPress: () => void }[] = [
    {
      label: t.textbookMy,
      value: textbookLabel,
      icon: 'book-outline',
      onPress: () => navigation.navigate('SettingOption', { key: 'textbook' }),
    },
    {
      label: t.studyRecords,
      icon: 'time-outline',
      onPress: () => navigation.navigate('Records'),
    },
    {
      label: t.wrongQuestions,
      icon: 'alert-circle-outline',
      onPress: () => navigation.navigate('WrongQuestions'),
    },
    {
      label: t.settings,
      icon: 'settings-outline',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]} contentContainerStyle={[styles.content, { paddingHorizontal: 16 * spacing, paddingTop: 0, paddingBottom: 40 * spacing }]}>
      {/* User info — 整块点击进入「个人信息」 */}
      <TouchableOpacity
        style={[styles.userCard, userCardStyle, { paddingHorizontal: 16 * spacing, paddingVertical: 20 * spacing, borderRadius: 12 * radius, marginBottom: 20 * spacing }]}
        onPress={() => navigation.navigate('ProfileInfo')}
        activeOpacity={0.7}
      >
        <View style={[styles.avatarContainer, { backgroundColor: colors.accentLight, width: 56 * spacing, height: 56 * spacing, borderRadius: 28 * spacing, elevation: isDark ? 0 : 2, shadowOpacity: isDark ? 0 : 0.08 }]}>
          {avatarUrl ? (
            <Image
              source={avatarUrl}
              style={[styles.avatarImage, { borderRadius: 28 * spacing }]}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <Text style={[styles.avatar, { color: colors.accentStrong, fontSize: 24 * font }]}>
              {user?.nickname?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? '?'}
            </Text>
          )}
        </View>
        <View style={[styles.userInfo, { marginLeft: 14 * spacing }]}>
          <Text style={[styles.username, { color: colors.text, fontSize: 18 * font, marginBottom: 2 * spacing }]} numberOfLines={1}>
            {user?.nickname ?? user?.username ?? t.defaultUser}
          </Text>
          <Text style={[styles.userSub, { color: colors.textSecondary, fontSize: 13 * font }]} numberOfLines={1}>
            @{user?.username ?? ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20 * font} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* Menu */}
      <View style={[styles.menuSection, listCardStyle, { borderRadius: 12 * radius, marginBottom: 24 * spacing }]}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              { paddingHorizontal: 12 * spacing, paddingVertical: 12 * spacing },
              index < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
            ]}
            onPress={item.onPress}
            activeOpacity={0.6}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.background, width: 36 * spacing, height: 36 * spacing, borderRadius: 10 * radius, marginRight: 12 * spacing }]}>
              <Ionicons name={item.icon} size={20 * font} color={colors.accent} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text, fontSize: 16 * font }]}>{item.label}</Text>
            {!!item.value && (
              <Text
                style={[styles.menuValue, { color: colors.textSecondary, fontSize: 13 * font, marginRight: 6 * spacing }]}
                numberOfLines={1}
              >
                {item.value}
              </Text>
            )}
            <Ionicons name="chevron-forward" size={20 * font} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    fontSize: 24,
    fontWeight: '700',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  userSub: {
    fontSize: 13,
  },
  menuSection: {
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  menuValue: {
    fontSize: 13,
    maxWidth: '50%',
  },
  menuArrow: {
    fontSize: 22,
    fontWeight: '300',
  },
});

export default ProfileScreen;

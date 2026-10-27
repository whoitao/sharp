import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { buildAvatarUrl } from '@sharp/shared';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import type { AppDispatch, RootState } from '../../stores';
import { uploadAvatar } from '../../stores/authSlice';

/** 头像统一压到 512px 方形 JPEG，远小于服务端 1MB 上限 */
const AVATAR_SIZE = 512;

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

interface ProfileScreenProps {
  navigation: NavigationProp;
}

type MenuIcon = React.ComponentProps<typeof Ionicons>['name'];

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isUploading, setIsUploading] = useState(false);

  // DB 里只存相对路径 {userId}/avatars/avatar.{ext}，展示层拼完整 URL
  // 兼容历史：如果 user.avatar 已是完整 https:// URL，buildAvatarUrl 原样返回
  const avatarUrl = useMemo(
    () => buildAvatarUrl(user?.avatar ?? null, process.env.EXPO_PUBLIC_SUPABASE_URL),
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

  const handleChangeAvatar = useCallback(async () => {
    if (isUploading) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t.avatarPermission);
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      // iOS 的方形裁剪框本身是固定的，aspect 只在 Android 生效
      aspect: [1, 1],
      quality: 0.8,
    });
    if (picked.canceled) return;
    const source = picked.assets[0]?.uri;
    if (!source) return;

    setIsUploading(true);
    let stage = 'compress'; // TEMP-DIAG
    try {
      const context = ImageManipulator.manipulate(source);
      context.resize({ width: AVATAR_SIZE, height: AVATAR_SIZE });
      const rendered = await context.renderAsync();
      const result = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
      stage = 'upload'; // TEMP-DIAG
      await dispatch(uploadAvatar({ uri: result.uri, name: 'avatar.jpg', type: 'image/jpeg' })).unwrap();
    } catch (err: any) { // TEMP-DIAG
      if (err === 'tooLarge') {
        Alert.alert(t.avatarTooLarge);
      } else {
        const detail = typeof err === 'string' ? err : `${err?.name ?? 'Error'}: ${err?.message ?? String(err)}`;
        Alert.alert(t.avatarUploadFailed, `[诊断·${stage}] ${detail}`.slice(0, 400));
      }
    } finally {
      setIsUploading(false);
    }
  }, [dispatch, isUploading, t]);

  const menuItems: { label: string; icon: MenuIcon; onPress: () => void }[] = [
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
      {/* User info */}
      <View style={[styles.userCard, userCardStyle, { padding: 24 * spacing, borderRadius: 12 * radius, marginBottom: 20 * spacing }]}>
        <TouchableOpacity
          style={[styles.avatarContainer, { backgroundColor: colors.accentLight, width: 72 * spacing, height: 72 * spacing, borderRadius: 36 * spacing, marginBottom: 14 * spacing, elevation: isDark ? 0 : 2, shadowOpacity: isDark ? 0 : 0.08 }]}
          onPress={handleChangeAvatar}
          activeOpacity={0.75}
          disabled={isUploading}
        >
          {avatarUrl ? (
            <Image
              source={avatarUrl}
              style={[styles.avatarImage, { borderRadius: 36 * spacing }]}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <Text style={[styles.avatar, { color: colors.accentStrong, fontSize: 30 * font }]}>
              {user?.nickname?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? '?'}
            </Text>
          )}
          {isUploading && (
            <View style={[styles.avatarOverlay, { borderRadius: 36 * spacing }]}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={[styles.username, { color: colors.text, fontSize: 20 * font, marginBottom: 4 * spacing }]}>{user?.nickname ?? user?.username ?? t.defaultUser}</Text>
        <Text style={[styles.userSub, { color: colors.textSecondary, fontSize: 14 * font }]}>@{user?.username ?? ''}</Text>
        <Text style={[styles.avatarHint, { color: colors.textSecondary, fontSize: 12 * font, marginTop: 8 * spacing }]}>
          {isUploading ? t.avatarUploading : t.editAvatar}
        </Text>
      </View>

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
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    fontSize: 30,
    fontWeight: '700',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  avatarHint: {
    fontSize: 12,
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  userSub: {
    fontSize: 14,
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
  menuArrow: {
    fontSize: 22,
    fontWeight: '300',
  },
});

export default ProfileScreen;

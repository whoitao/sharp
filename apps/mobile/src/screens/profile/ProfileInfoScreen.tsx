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
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import type { AppDispatch, RootState } from '../../stores';
import { updateProfile, uploadAvatar } from '../../stores/authSlice';

/** 头像统一压到 512px 方形 JPEG，远小于服务端大小上限 */
const AVATAR_SIZE = 512;
/** 个人信息页头像行内的头像直径（截图要求缩小） */
const ROW_AVATAR_SIZE = 36;
const PHONE_RE = /^1\d{10}$/;

// 与 api.ts 的 API_BASE_URL 同款兜底：release 构建若未内联 .env 变量，process.env 里会是 undefined，
// 缺了它 buildAvatarUrl 只能返回 null，头像永远显示不出（安卓 APK 实测缺失）
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://faliyecwupijgmjbvzca.supabase.co';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileInfo'>;
type TextField = 'nickname' | 'phone';

interface ProfileInfoScreenProps {
  navigation: NavigationProp;
}

const ProfileInfoScreen: React.FC<ProfileInfoScreenProps> = () => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  const [isUploading, setIsUploading] = useState(false);
  // 昵称/手机号共用一个文本输入弹窗，editingField 为 null 时关闭
  const [editingField, setEditingField] = useState<TextField | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textError, setTextError] = useState<string | null>(null);
  const [isSavingText, setIsSavingText] = useState(false);
  // 性别选择弹窗
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [genderError, setGenderError] = useState<string | null>(null);
  const [isSavingGender, setIsSavingGender] = useState(false);

  // DB 里只存相对路径，展示层拼完整 URL；兼容历史完整 URL
  const avatarUrl = useMemo(
    () => buildAvatarUrl(user?.avatar ?? null, SUPABASE_URL),
    [user?.avatar]
  );

  const cardStyle = {
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
    try {
      const context = ImageManipulator.manipulate(source);
      context.resize({ width: AVATAR_SIZE, height: AVATAR_SIZE });
      const rendered = await context.renderAsync();
      const result = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
      await dispatch(uploadAvatar({ uri: result.uri, name: 'avatar.jpg', type: 'image/jpeg' })).unwrap();
    } catch (err: any) {
      if (err === 'tooLarge') {
        Alert.alert(t.avatarTooLarge);
      } else {
        Alert.alert(t.avatarUploadFailed);
      }
    } finally {
      setIsUploading(false);
    }
  }, [dispatch, isUploading, t]);

  const openTextModal = useCallback((field: TextField) => {
    setEditingField(field);
    setTextInput(field === 'nickname' ? (user?.nickname ?? '') : (user?.phone ?? ''));
    setTextError(null);
  }, [user?.nickname, user?.phone]);

  const handleSaveText = useCallback(async () => {
    if (!editingField) return;
    const value = textInput.trim();
    if (editingField === 'nickname') {
      if (!value) {
        setTextError(t.nicknameEmpty);
        return;
      }
      if (value === (user?.nickname ?? '')) {
        setEditingField(null);
        return;
      }
    } else {
      if (!PHONE_RE.test(value)) {
        setTextError(t.phoneInvalid);
        return;
      }
      if (value === (user?.phone ?? '')) {
        setEditingField(null);
        return;
      }
    }
    setIsSavingText(true);
    try {
      await dispatch(updateProfile({ [editingField]: value })).unwrap();
      setEditingField(null);
    } catch {
      setTextError(editingField === 'nickname' ? t.nicknameUpdateFailed : t.phoneUpdateFailed);
    } finally {
      setIsSavingText(false);
    }
  }, [dispatch, editingField, textInput, t, user?.nickname, user?.phone]);

  const handleSelectGender = useCallback(async (gender: 'male' | 'female') => {
    if (isSavingGender) return;
    if (gender === user?.gender) {
      setGenderModalVisible(false);
      return;
    }
    setIsSavingGender(true);
    setGenderError(null);
    try {
      await dispatch(updateProfile({ gender })).unwrap();
      setGenderModalVisible(false);
    } catch {
      setGenderError(t.genderUpdateFailed);
    } finally {
      setIsSavingGender(false);
    }
  }, [dispatch, isSavingGender, t, user?.gender]);

  const renderAvatar = (size: number) => (
    <View
      style={[
        styles.avatarContainer,
        {
          backgroundColor: colors.accentLight,
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {avatarUrl ? (
        <Image
          source={avatarUrl}
          style={[styles.avatarImage, { borderRadius: size / 2 }]}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <Text style={[styles.avatarText, { color: colors.accentStrong, fontSize: size * 0.42 }]}>
          {user?.nickname?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? '?'}
        </Text>
      )}
      {isUploading && (
        <View style={[styles.avatarOverlay, { borderRadius: size / 2 }]}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      )}
    </View>
  );

  const genderLabel = user?.gender === 'male' ? t.genderMale : user?.gender === 'female' ? t.genderFemale : t.notSet;

  const renderRow = (
    label: string,
    onPress: () => void,
    right: React.ReactNode,
    isLast = false,
    disabled = false,
  ) => (
    <TouchableOpacity
      style={[
        styles.row,
        {
          paddingHorizontal: 12 * spacing,
          paddingVertical: 12 * spacing,
        },
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
      ]}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={disabled}
    >
      <Text style={[styles.rowLabel, { color: colors.text, fontSize: 16 * font }]}>{label}</Text>
      <View style={styles.rowRight}>
        {right}
        <Ionicons name="chevron-forward" size={20 * font} color={colors.textTertiary} style={{ marginLeft: 8 * spacing }} />
      </View>
    </TouchableOpacity>
  );

  const renderRowValue = (value: string) => (
    <Text
      style={[styles.rowValue, { color: colors.textSecondary, fontSize: 15 * font }]}
      numberOfLines={1}
    >
      {value}
    </Text>
  );

  const textModalTitle = editingField === 'phone' ? t.phone : t.nickname;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      contentContainerStyle={{ paddingHorizontal: 16 * spacing, paddingTop: 0, paddingBottom: 40 * spacing }}
    >
      <View style={[styles.card, cardStyle, { borderRadius: 12 * radius }]}>
        {/* 头像 */}
        {renderRow(t.avatar, handleChangeAvatar, renderAvatar(ROW_AVATAR_SIZE * spacing), false, isUploading)}
        {/* 昵称 */}
        {renderRow(t.nickname, () => openTextModal('nickname'), renderRowValue(user?.nickname ?? user?.username ?? t.defaultUser))}
        {/* 性别 */}
        {renderRow(t.gender, () => { setGenderError(null); setGenderModalVisible(true); }, renderRowValue(genderLabel))}
        {/* 手机号 */}
        {renderRow(t.phone, () => openTextModal('phone'), renderRowValue(user?.phone ?? t.notSet), true)}
      </View>

      {/* 昵称/手机号输入弹窗：不用 Alert.prompt（iOS only / web 不支持），保证跨端一致 */}
      <Modal
        visible={editingField !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingField(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setEditingField(null)}
          />
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderRadius: 12 * radius, padding: 20 * spacing }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 17 * font, marginBottom: 14 * spacing }]}>
              {textModalTitle}
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  color: colors.text,
                  borderColor: textError ? colors.error : colors.border,
                  backgroundColor: colors.background,
                  fontSize: 15 * font,
                  borderRadius: 8 * radius,
                  paddingHorizontal: 12 * spacing,
                  paddingVertical: 10 * spacing,
                },
              ]}
              value={textInput}
              onChangeText={(text) => {
                setTextInput(text);
                if (textError) setTextError(null);
              }}
              placeholder={editingField === 'phone' ? t.phonePlaceholder : t.nicknamePlaceholder}
              placeholderTextColor={colors.textTertiary}
              maxLength={editingField === 'phone' ? 11 : 24}
              keyboardType={editingField === 'phone' ? 'phone-pad' : 'default'}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveText}
            />
            {!!textError && (
              <Text style={[styles.modalError, { color: colors.error, fontSize: 12 * font, marginTop: 6 * spacing }]}>
                {textError}
              </Text>
            )}
            <View style={[styles.modalButtons, { marginTop: 18 * spacing }]}>
              <TouchableOpacity
                style={[styles.modalButton, { borderRadius: 8 * radius, paddingVertical: 10 * spacing, backgroundColor: colors.background, marginRight: 10 * spacing }]}
                onPress={() => setEditingField(null)}
                disabled={isSavingText}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 15 * font }}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { borderRadius: 8 * radius, paddingVertical: 10 * spacing, backgroundColor: colors.accent }]}
                onPress={handleSaveText}
                disabled={isSavingText}
              >
                {isSavingText ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 15 * font }}>{t.confirm}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 性别选择弹窗 */}
      <Modal
        visible={genderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGenderModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setGenderModalVisible(false)}
          />
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderRadius: 12 * radius, padding: 20 * spacing }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 17 * font, marginBottom: 6 * spacing }]}>
              {t.gender}
            </Text>
            {(['male', 'female'] as const).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.genderOption, { paddingVertical: 12 * spacing }]}
                onPress={() => handleSelectGender(option)}
                disabled={isSavingGender}
                activeOpacity={0.6}
              >
                <Text style={{ color: colors.text, fontSize: 16 * font, flex: 1 }}>
                  {option === 'male' ? t.genderMale : t.genderFemale}
                </Text>
                {user?.gender === option && (
                  <Ionicons name="checkmark" size={20 * font} color={colors.accent} />
                )}
              </TouchableOpacity>
            ))}
            {isSavingGender && (
              <ActivityIndicator color={colors.accent} size="small" style={{ marginTop: 4 * spacing }} />
            )}
            {!!genderError && (
              <Text style={[styles.modalError, { color: colors.error, fontSize: 12 * font, marginTop: 6 * spacing, textAlign: 'center' }]}>
                {genderError}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '60%',
  },
  rowValue: {
    fontSize: 15,
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontWeight: '700',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    fontSize: 15,
  },
  modalError: {
    fontSize: 12,
  },
  modalButtons: {
    flexDirection: 'row',
  },
  modalButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ProfileInfoScreen;

import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PetSpeciesInfo } from '@sharp/shared';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { HomeStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../services/api';
import { cardShadow } from '../../theme/shadows';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'PetAdopt'>;

interface PetAdoptScreenProps {
  navigation: NavigationProp;
}

const NICKNAME_MAX = 8;

const PetAdoptScreen: React.FC<PetAdoptScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  // Modal 在 Android 上是独立窗口，但 insets 走 React context，navigation 的
  // SafeAreaProviderCompat 已经把值传进来了（本文件外层的 PetScreen 也在用 insets）。
  // 仍保留兜底：若 Modal 内拿到 0，用「屏幕高 - 窗口高」推算系统栏高度。
  // 上限 96 是防御：键盘弹起时窗口会变矮，避免把键盘高度误算成底部安全区。
  const fallbackBottomInset =
    insets.bottom > 0
      ? 0
      : Math.min(
          Math.max(0, Math.round(Dimensions.get('screen').height - windowHeight)),
          96
        );
  const bottomInset = Math.max(insets.bottom, fallbackBottomInset);

  const [species, setSpecies] = useState<PetSpeciesInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  // state 更新是异步的，连点确认时用 ref 做同步闸门
  const submittingRef = useRef(false);

  useEffect(() => {
    let alive = true;
    api.getPetSpecies().then((list) => {
      if (!alive) return;
      setSpecies(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const selectedSpecies = species.find((item) => item.id === selectedId) ?? null;
  const trimmedName = nickname.trim();
  const canConfirm = trimmedName.length > 0 && trimmedName.length <= NICKNAME_MAX && !submitting;

  const openSheet = useCallback((id: string) => {
    setSelectedId(id);
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => {
    // 提交中不允许关闭，避免请求成功但页面已回列表造成状态不一致
    if (submittingRef.current) return;
    Keyboard.dismiss();
    setSheetVisible(false);
  }, []);

  const handleAdopt = useCallback(async () => {
    if (!selectedId || submittingRef.current) return;
    const name = nickname.trim();
    if (name.length === 0 || name.length > NICKNAME_MAX) {
      Alert.alert(t.petAdoptTitle, t.petNicknameInvalid);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await api.adoptPet(selectedId, name);
      Keyboard.dismiss();
      setSheetVisible(false);
      navigation.replace('Pet');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'PET_ALREADY_ADOPTED') {
        Alert.alert(t.petAdoptTitle, t.petAlreadyAdopted, [
          { text: t.confirm, onPress: () => navigation.replace('Pet') },
        ]);
      } else if (message === 'INVALID_NICKNAME') {
        Alert.alert(t.petAdoptTitle, t.petNicknameInvalid);
      } else {
        Alert.alert(t.petAdoptTitle, t.petAdoptFailed);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [navigation, nickname, selectedId, t]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16 * spacing,
          paddingTop: 0,
          paddingBottom: 24 * spacing,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {species.map((item) => {
            const active = item.id === selectedId;
            const cover = item.stages[0]?.imageUrl;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => openSheet(item.id)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.row,
                  {
                    backgroundColor: active ? colors.accentLight : colors.surface,
                    borderColor: active ? colors.accent : colors.borderLight,
                    borderRadius: 14 * radius,
                    padding: 12 * spacing,
                    marginBottom: 10 * spacing,
                  },
                  cardShadow(isDark),
                ]}
              >
                <View
                  style={[
                    styles.coverWrap,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: 12 * radius,
                    },
                  ]}
                >
                  {cover ? (
                    <Image source={{ uri: cover }} contentFit="contain" style={styles.cover} />
                  ) : (
                    <Text style={{ fontSize: 34 }}>{item.icon ?? '🐾'}</Text>
                  )}
                </View>

                <View style={{ flex: 1, marginLeft: 12 * spacing }}>
                  <Text
                    style={{ color: colors.text, fontSize: 15 * font, fontWeight: '700' }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {item.tagline ? (
                    <Text
                      numberOfLines={2}
                      style={{
                        color: colors.textTertiary,
                        fontSize: 12 * font,
                        lineHeight: 17 * font,
                        marginTop: 3 * spacing,
                      }}
                    >
                      {item.tagline}
                    </Text>
                  ) : null}
                </View>

                <Ionicons
                  name={active ? 'checkmark-circle' : 'chevron-forward'}
                  size={(active ? 22 : 18) * font}
                  color={active ? colors.accent : colors.textTertiary}
                  style={{ marginLeft: 8 * spacing }}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          // iOS 用 padding 顶起弹层；Android 的 Modal 窗口由 RN 设为 ADJUST_RESIZE，
          // 键盘弹起时窗口自身变矮，再叠加 height/padding 会二次收缩，故不设 behavior。
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeSheet}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: 20 * radius,
                borderTopRightRadius: 20 * radius,
                paddingHorizontal: 20 * spacing,
                paddingTop: 18 * spacing,
                // 基础留白 + 底部安全区：Android 手势条 / 三键导航不再压住按钮
                paddingBottom: 16 * spacing + bottomInset,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={{ color: colors.text, fontSize: 17 * font, fontWeight: '700' }}>
                {t.petAdoptNickname}
              </Text>
              {selectedSpecies ? (
                <Text style={{ color: colors.textTertiary, fontSize: 12 * font }}>
                  {selectedSpecies.name}
                </Text>
              ) : null}
            </View>

            <TextInput
              value={nickname}
              onChangeText={setNickname}
              maxLength={NICKNAME_MAX}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void handleAdopt()}
              placeholder={t.petAdoptNicknamePlaceholder}
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.text,
                  borderRadius: 12 * radius,
                  paddingHorizontal: 12 * spacing,
                  fontSize: 15 * font,
                  marginTop: 14 * spacing,
                },
              ]}
            />

            <View style={[styles.actions, { marginTop: 16 * spacing }]}>
              <TouchableOpacity
                onPress={closeSheet}
                activeOpacity={0.7}
                accessibilityRole="button"
                style={[
                  styles.button,
                  {
                    borderColor: colors.border,
                    borderRadius: 12 * radius,
                    marginRight: 10 * spacing,
                  },
                ]}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 15 * font, fontWeight: '600' }}>
                  {t.cancel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleAdopt()}
                disabled={!canConfirm}
                activeOpacity={0.8}
                accessibilityRole="button"
                style={[
                  styles.button,
                  {
                    backgroundColor: canConfirm ? colors.accent : colors.border,
                    borderColor: canConfirm ? colors.accent : colors.border,
                    borderRadius: 12 * radius,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text
                    style={{
                      color: canConfirm ? '#FFFFFF' : colors.textTertiary,
                      fontSize: 15 * font,
                      fontWeight: '600',
                    }}
                  >
                    {t.petAdoptConfirm}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  coverWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cover: {
    width: 56,
    height: 56,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    height: 46,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actions: {
    flexDirection: 'row',
  },
  button: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default PetAdoptScreen;

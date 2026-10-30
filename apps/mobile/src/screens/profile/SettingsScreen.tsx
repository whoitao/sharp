import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { DENSITY_OPTIONS, LANGUAGE_OPTIONS, THEME_OPTIONS, type SettingKey } from '../../constants/settings';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import type { AppDispatch, RootState } from '../../stores';
import { logout } from '../../stores/authSlice';
import { readCrashes } from '../../utils/crashLog';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Settings'>;

interface SettingsScreenProps {
  navigation: NavigationProp;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { unitSize, theme, language, density } = useSelector(
    (state: RootState) => state.settings,
  );
  const [crashCount, setCrashCount] = useState(0);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const loadCrashCount = useCallback(async () => {
    setCrashCount((await readCrashes()).length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCrashCount();
    }, [loadCrashCount])
  );

  // 当前值文案（显示在入口行右侧）
  const languageLabel = t[LANGUAGE_OPTIONS.find((o) => o.value === language)?.labelKey ?? 'chinese'];
  const themeLabel = t[THEME_OPTIONS.find((o) => o.value === theme)?.labelKey ?? 'system'];
  const densityLabel = t[DENSITY_OPTIONS.find((o) => o.value === density)?.labelKey ?? 'densityComfortable'];

  // 一级入口：点击进入二级页选择具体值
  const settingRows: { key: SettingKey; label: string; value: string }[] = [
    { key: 'language', label: t.language, value: languageLabel },
    { key: 'theme', label: t.theme, value: themeLabel },
    { key: 'density', label: t.displayDensity, value: densityLabel },
    { key: 'unitSize', label: t.unitSize, value: `${unitSize}` },
  ];

  // 浏览器端不支持 Alert.alert，改用应用内弹窗确认
  const handleLogout = () => {
    setLogoutVisible(true);
  };

  const confirmLogout = () => {
    setLogoutVisible(false);
    dispatch(logout());
  };

  const sectionPadding = 16 * spacing;
  const sectionMarginBottom = 16 * spacing;
  const titleFontSize = 18 * font;
  // 卡片层级：白底 + hairline；深色下 elevation 会变成黑边，关掉
  const cardChrome = {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    elevation: isDark ? 0 : 2,
    shadowOpacity: isDark ? 0 : 0.04,
  };


  return (
    <ScrollView style={[styles.container, { backgroundColor: 'transparent' }]} contentContainerStyle={styles.content}>
      {/* 设置项入口（一级） */}
      <View style={[styles.section, styles.menuCard, cardChrome, { marginBottom: sectionMarginBottom }]}>
        {settingRows.map((row, index) => (
          <TouchableOpacity
            key={row.key}
            style={[
              styles.settingRow,
              {
                paddingVertical: 16 * spacing,
                paddingHorizontal: sectionPadding,
                borderBottomColor: colors.borderLight,
                borderBottomWidth: index === settingRows.length - 1 ? 0 : StyleSheet.hairlineWidth,
              },
            ]}
            onPress={() => navigation.navigate('SettingOption', { key: row.key })}
            activeOpacity={0.7}
          >
            <Text style={[styles.settingLabel, { color: colors.text, fontSize: 16 * font }]}>{row.label}</Text>
            <View style={styles.settingValueWrap}>
              <Text style={[styles.settingValue, { color: colors.textSecondary, fontSize: 14 * font, marginRight: 6 * spacing }]}>
                {row.value}
              </Text>
              <Ionicons name="chevron-forward" size={18 * font} color={colors.textTertiary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* About section：崩溃日志收成最后一行，不再单独占一张同级大卡 */}
      <View style={[styles.section, cardChrome, { padding: sectionPadding, marginBottom: sectionMarginBottom }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: titleFontSize, marginBottom: 10 * spacing }]}>{t.about}</Text>
        <View style={[styles.aboutRow, { borderBottomColor: colors.borderLight, paddingVertical: 12 * spacing }]}>
          <Text style={[styles.aboutLabel, { color: colors.textSecondary, fontSize: 15 * font }]}>{t.version}</Text>
          <Text style={[styles.aboutValue, { color: colors.textSecondary, fontSize: 15 * font }]}>1.0.0</Text>
        </View>
        <View style={[styles.aboutRow, { borderBottomColor: colors.borderLight, paddingVertical: 12 * spacing }]}>
          <Text style={[styles.aboutLabel, { color: colors.textSecondary, fontSize: 15 * font }]}>{t.appName}</Text>
          <Text style={[styles.aboutValue, { color: colors.textSecondary, fontSize: 15 * font }]}>{t.appNameValue}</Text>
        </View>
        <TouchableOpacity
          style={[styles.aboutRow, { borderBottomWidth: 0, paddingVertical: 12 * spacing }]}
          onPress={() => navigation.navigate('CrashLog')}
          activeOpacity={0.7}
        >
          <Text style={[styles.aboutLabel, { color: colors.textSecondary, fontSize: 15 * font }]}>{t.crashLogTitle}</Text>
          <View style={styles.settingValueWrap}>
            <Text style={[styles.aboutValue, { color: crashCount > 0 ? colors.error : colors.textSecondary, fontSize: 15 * font, marginRight: 6 * spacing }]}>
              {crashCount}
            </Text>
            <Ionicons name="chevron-forward" size={16 * font} color={colors.textTertiary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Logout button */}
      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: colors.dangerSurface, borderRadius: 12 * radius, paddingVertical: 16 * spacing }]}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text style={[styles.logoutText, { color: colors.error, fontSize: 16 * font }]}>{t.logout}</Text>
      </TouchableOpacity>

      {/* 退出登录确认 */}
      <Modal
        visible={logoutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderRadius: 14 * radius, padding: 20 * spacing }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontSize: 17 * font }]}>{t.logout}</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary, fontSize: 14 * font, marginTop: 8 * spacing, marginBottom: 20 * spacing }]}>
              {t.logoutConfirm}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { borderColor: colors.border, borderRadius: 10 * radius, paddingVertical: 12 * spacing }]}
                onPress={() => setLogoutVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary, fontSize: 15 * font }]}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger, { borderRadius: 10 * radius, paddingVertical: 12 * spacing }]}
                onPress={confirmLogout}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonText, { color: colors.error, fontSize: 15 * font }]}>{t.confirm}</Text>
              </TouchableOpacity>
            </View>
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
  content: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 80,
  },
  section: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 16,
  },
  settingValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 14,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  customInputRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  customSubmit: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  customSubmitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  currentValue: {
    fontSize: 13,
    marginTop: 10,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  aboutLabel: {
    fontSize: 15,
  },
  aboutValue: {
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    fontWeight: '600',
    textAlign: 'center',
  },
  modalMessage: {
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modalButtonDanger: {
    borderWidth: 0,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  modalButtonText: {
    fontWeight: '600',
  },
  logoutButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;

import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Density, Language, Theme } from '@sharp/shared';
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
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { StringTranslationKey } from '../../i18n/zh';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import type { AppDispatch, RootState } from '../../stores';
import { logout } from '../../stores/authSlice';
import { setDensity, setLanguage, setTheme, setUnitSize, updateSettings } from '../../stores/settingsSlice';
import { readCrashes } from '../../utils/crashLog';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Settings'>;

interface SettingsScreenProps {
  navigation: NavigationProp;
}

const UNIT_SIZE_OPTIONS = [20, 30, 50, 100];
const THEME_OPTIONS: { value: Theme; labelKey: StringTranslationKey }[] = [
  { value: 'light' as Theme, labelKey: 'light' },
  { value: 'dark' as Theme, labelKey: 'dark' },
  { value: 'system' as Theme, labelKey: 'system' },
];
const LANGUAGE_OPTIONS: { value: Language; labelKey: StringTranslationKey }[] = [
  { value: 'zh' as Language, labelKey: 'chinese' },
  { value: 'en' as Language, labelKey: 'english' },
];
const DENSITY_OPTIONS: { value: Density; labelKey: StringTranslationKey }[] = [
  { value: 'compact' as Density, labelKey: 'densityCompact' },
  { value: 'comfortable' as Density, labelKey: 'densityComfortable' },
  { value: 'spacious' as Density, labelKey: 'densitySpacious' },
];

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { unitSize, theme, language, density } = useSelector((state: RootState) => state.settings);
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

  const handleUnitSizeChange = (size: number) => {
    dispatch(setUnitSize(size));
    dispatch(updateSettings({ unitSize: size }));
  };

  const handleThemeChange = (newTheme: Theme) => {
    dispatch(setTheme(newTheme));
    dispatch(updateSettings({ theme: newTheme }));
  };

  const handleLanguageChange = (newLanguage: Language) => {
    dispatch(setLanguage(newLanguage));
    dispatch(updateSettings({ language: newLanguage }));
  };

  const handleDensityChange = (newDensity: Density) => {
    dispatch(setDensity(newDensity));
    dispatch(updateSettings({ density: newDensity }));
  };

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
  const optionFontSize = 16 * font;
  const optionVerticalPadding = 12 * spacing;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Display density section */}
      <View style={[styles.section, { backgroundColor: colors.surface, padding: sectionPadding, marginBottom: sectionMarginBottom }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: titleFontSize, marginBottom: 10 * spacing }]}>{t.displayDensity}</Text>

        <View style={styles.optionsGrid}>
          {DENSITY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionButton,
                { backgroundColor: colors.borderLight, paddingVertical: optionVerticalPadding, borderRadius: 10 * spacing },
                density === opt.value && { backgroundColor: colors.accent },
              ]}
              onPress={() => handleDensityChange(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: colors.textSecondary, fontSize: optionFontSize },
                  density === opt.value && { color: colors.surface },
                ]}
              >
                {t[opt.labelKey]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Unit size section */}
      <View style={[styles.section, { backgroundColor: colors.surface, padding: sectionPadding, marginBottom: sectionMarginBottom }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: titleFontSize, marginBottom: 10 * spacing }]}>{t.unitSize}</Text>

        <View style={styles.optionsGrid}>
          {UNIT_SIZE_OPTIONS.map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.optionButton,
                { backgroundColor: colors.borderLight, paddingVertical: optionVerticalPadding, borderRadius: 10 * spacing },
                unitSize === size && { backgroundColor: colors.accent },
              ]}
              onPress={() => handleUnitSizeChange(size)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: colors.textSecondary, fontSize: optionFontSize },
                  unitSize === size && { color: colors.surface },
                ]}
              >
                {size}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Theme section */}
      <View style={[styles.section, { backgroundColor: colors.surface, padding: sectionPadding, marginBottom: sectionMarginBottom }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: titleFontSize, marginBottom: 10 * spacing }]}>{t.theme}</Text>

        <View style={styles.themeOptions}>
          {THEME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.themeButton,
                { backgroundColor: colors.background, paddingVertical: 14 * spacing, borderRadius: 10 * spacing },
                theme === opt.value && { backgroundColor: colors.accentLight, borderColor: colors.accent },
              ]}
              onPress={() => handleThemeChange(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.themeText,
                  { color: colors.textSecondary, fontSize: 15 * font },
                  theme === opt.value && { color: colors.accent },
                ]}
              >
                {t[opt.labelKey]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Language section */}
      <View style={[styles.section, { backgroundColor: colors.surface, padding: sectionPadding, marginBottom: sectionMarginBottom }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: titleFontSize, marginBottom: 10 * spacing }]}>{t.language}</Text>

        <View style={styles.optionsGrid}>
          {LANGUAGE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionButton,
                { backgroundColor: colors.borderLight, paddingVertical: optionVerticalPadding, borderRadius: 10 * spacing },
                language === opt.value && { backgroundColor: colors.accent },
              ]}
              onPress={() => handleLanguageChange(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: colors.textSecondary, fontSize: optionFontSize },
                  language === opt.value && { color: colors.surface },
                ]}
              >
                {t[opt.labelKey]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* About section */}
      <View style={[styles.section, { backgroundColor: colors.surface, padding: sectionPadding, marginBottom: sectionMarginBottom }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: titleFontSize, marginBottom: 10 * spacing }]}>{t.about}</Text>
        <View style={[styles.aboutRow, { borderBottomColor: colors.borderLight, paddingVertical: 12 * spacing }]}>
          <Text style={[styles.aboutLabel, { color: colors.textSecondary, fontSize: 15 * font }]}>{t.version}</Text>
          <Text style={[styles.aboutValue, { color: colors.textSecondary, fontSize: 15 * font }]}>1.0.0</Text>
        </View>
        <View style={[styles.aboutRow, { borderBottomWidth: 0, paddingVertical: 12 * spacing }]}>
          <Text style={[styles.aboutLabel, { color: colors.textSecondary, fontSize: 15 * font }]}>{t.appName}</Text>
          <Text style={[styles.aboutValue, { color: colors.textSecondary, fontSize: 15 * font }]}>{t.appNameValue}</Text>
        </View>
      </View>

      {/* Crash log entry */}
      <TouchableOpacity
        style={[
          styles.entryButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            paddingVertical: 16 * spacing,
            paddingHorizontal: 20 * spacing,
            borderRadius: 16 * radius,
            marginTop: 8 * spacing,
          },
        ]}
        onPress={() => navigation.navigate('CrashLog')}
        activeOpacity={0.8}
      >
        <Text style={[styles.entryLabel, { color: colors.text, fontSize: 16 * font }]}>{t.crashLogTitle}</Text>
        <Text
          style={[
            styles.entryValue,
            { color: crashCount > 0 ? colors.error : colors.textTertiary, fontSize: 15 * font },
          ]}
        >
          {crashCount}
        </Text>
      </TouchableOpacity>

      {/* Logout button */}
      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: colors.surface, borderColor: colors.errorLight, paddingVertical: 16 * spacing, borderRadius: 16 * spacing }]}
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
    borderRadius: 16,
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
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  entryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  entryLabel: {
    fontWeight: '600',
  },
  entryValue: {
    fontVariant: ['tabular-nums'],
  },
});

export default SettingsScreen;

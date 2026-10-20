import type { Language, Theme } from '@sharp/shared';
import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { AppDispatch, RootState } from '../../stores';
import { logout } from '../../stores/authSlice';
import { setLanguage, setTheme, setUnitSize, updateSettings } from '../../stores/settingsSlice';

const UNIT_SIZE_OPTIONS = [20, 30, 50, 100];
const THEME_OPTIONS: { value: Theme; labelKey: string }[] = [
  { value: 'light' as Theme, labelKey: 'light' },
  { value: 'dark' as Theme, labelKey: 'dark' },
  { value: 'system' as Theme, labelKey: 'system' },
];
const LANGUAGE_OPTIONS: { value: Language; labelKey: string }[] = [
  { value: 'zh' as Language, labelKey: 'chinese' },
  { value: 'en' as Language, labelKey: 'english' },
];

const SettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { unitSize, theme, language } = useSelector((state: RootState) => state.settings);

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

  const handleLogout = () => {
    Alert.alert(
      t.logout,
      t.logoutConfirm,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.confirm,
          style: 'destructive',
          onPress: () => dispatch(logout()),
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Unit size section */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.unitSize}</Text>

        <View style={styles.optionsGrid}>
          {UNIT_SIZE_OPTIONS.map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.optionButton,
                { backgroundColor: colors.borderLight },
                unitSize === size && { backgroundColor: colors.accent },
              ]}
              onPress={() => handleUnitSizeChange(size)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: colors.textSecondary },
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
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.theme}</Text>

        <View style={styles.themeOptions}>
          {THEME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.themeButton,
                { backgroundColor: colors.background },
                theme === opt.value && { backgroundColor: colors.accentLight, borderColor: colors.accent },
              ]}
              onPress={() => handleThemeChange(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.themeText,
                  { color: colors.textSecondary },
                  theme === opt.value && { color: colors.accent },
                ]}
              >
                {t[opt.labelKey as keyof typeof t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Language section */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.language}</Text>

        <View style={styles.optionsGrid}>
          {LANGUAGE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionButton,
                { backgroundColor: colors.borderLight },
                language === opt.value && { backgroundColor: colors.accent },
              ]}
              onPress={() => handleLanguageChange(opt.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: colors.textSecondary },
                  language === opt.value && { color: colors.surface },
                ]}
              >
                {t[opt.labelKey as keyof typeof t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* About section */}
      <View style={[styles.section, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.about}</Text>
        <View style={[styles.aboutRow, { borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>{t.version}</Text>
          <Text style={[styles.aboutValue, { color: colors.textSecondary }]}>1.0.0</Text>
        </View>
        <View style={[styles.aboutRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>{t.appName}</Text>
          <Text style={[styles.aboutValue, { color: colors.textSecondary }]}>{t.appNameValue}</Text>
        </View>
      </View>

      {/* Logout button */}
      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: colors.surface, borderColor: colors.errorLight }]}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Text style={[styles.logoutText, { color: colors.error }]}>{t.logout}</Text>
      </TouchableOpacity>
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
});

export default SettingsScreen;

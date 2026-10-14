import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { Theme } from '@sharp/shared';
import { updateSettings, setUnitSize, setTheme } from '../../stores/settingsSlice';
import type { RootState, AppDispatch } from '../../stores';

const UNIT_SIZE_OPTIONS = [20, 30, 50, 100];
const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light' as Theme, label: '浅色' },
  { value: 'dark' as Theme, label: '深色' },
  { value: 'system' as Theme, label: '跟随系统' },
];

const SettingsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { unitSize, theme } = useSelector((state: RootState) => state.settings);

  const [customSize, setCustomSize] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleUnitSizeChange = (size: number) => {
    dispatch(setUnitSize(size));
    dispatch(updateSettings({ unitSize: size }));
    setShowCustom(false);
  };

  const handleCustomSizeSubmit = () => {
    const size = parseInt(customSize, 10);
    if (isNaN(size) || size < 5 || size > 500) {
      Alert.alert('提示', '请输入5-500之间的数字');
      return;
    }
    handleUnitSizeChange(size);
    setCustomSize('');
  };

  const handleThemeChange = (newTheme: Theme) => {
    dispatch(setTheme(newTheme));
    dispatch(updateSettings({ theme: newTheme }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Unit size section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>每单元题数</Text>
        <Text style={styles.sectionDesc}>设置每次练习的题目数量</Text>

        <View style={styles.optionsGrid}>
          {UNIT_SIZE_OPTIONS.map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.optionButton,
                unitSize === size && !showCustom && styles.optionButtonActive,
              ]}
              onPress={() => handleUnitSizeChange(size)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  unitSize === size && !showCustom && styles.optionTextActive,
                ]}
              >
                {size}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[
              styles.optionButton,
              showCustom && styles.optionButtonActive,
              !showCustom && !UNIT_SIZE_OPTIONS.includes(unitSize) && styles.optionButtonActive,
            ]}
            onPress={() => setShowCustom(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionText,
                (showCustom || !UNIT_SIZE_OPTIONS.includes(unitSize)) && styles.optionTextActive,
              ]}
            >
              自定义
            </Text>
          </TouchableOpacity>
        </View>

        {showCustom && (
          <View style={styles.customInputRow}>
            <TouchableOpacity
              style={styles.customSubmit}
              onPress={handleCustomSizeSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.customSubmitText}>确认</Text>
            </TouchableOpacity>
          </View>
        )}

        {!showCustom && !UNIT_SIZE_OPTIONS.includes(unitSize) && (
          <Text style={styles.currentValue}>当前: {unitSize} 题/单元</Text>
        )}
      </View>

      {/* Theme section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>主题</Text>
        <Text style={styles.sectionDesc}>选择应用的外观主题</Text>

        <View style={styles.themeOptions}>
          {THEME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.themeButton,
                theme === opt.value && styles.themeButtonActive,
              ]}
              onPress={() => handleThemeChange(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.themeIcon}>
                {opt.value === 'light' ? '☀️' : opt.value === 'dark' ? '🌙' : '📱'}
              </Text>
              <Text
                style={[
                  styles.themeText,
                  theme === opt.value && styles.themeTextActive,
                ]}
              >
                {opt.label}
              </Text>
              {theme === opt.value && (
                <Text style={styles.checkMark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* About section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于</Text>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>版本</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>应用名称</Text>
          <Text style={styles.aboutValue}>Sharp 智能刷题</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    minWidth: 70,
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#3B82F6',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  customInputRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  customSubmit: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  customSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  currentValue: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 10,
  },
  themeOptions: {
    gap: 10,
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  themeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  themeText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  themeTextActive: {
    color: '#3B82F6',
  },
  checkMark: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B82F6',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  aboutLabel: {
    fontSize: 15,
    color: '#374151',
  },
  aboutValue: {
    fontSize: 15,
    color: '#6B7280',
  },
});

export default SettingsScreen;

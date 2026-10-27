import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  DENSITY_OPTIONS,
  LANGUAGE_OPTIONS,
  THEME_OPTIONS,
  UNIT_SIZE_OPTIONS,
  type SettingKey,
} from '../../constants/settings';
import { useDensity } from '../../hooks/useDensity';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../i18n/useTranslation';
import type { StringTranslationKey } from '../../i18n/zh';
import type { ProfileStackParamList } from '../../navigation/AppNavigator';
import type { AppDispatch, RootState } from '../../stores';
import { setDensity, setLanguage, setTheme, setUnitSize, updateSettings } from '../../stores/settingsSlice';

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'SettingOption'>;
type RouteProps = RouteProp<ProfileStackParamList, 'SettingOption'>;

interface SettingOptionScreenProps {
  navigation: NavigationProp;
  route: RouteProps;
}

// 二级页标题取对应设置项名称
const TITLE_KEYS: Record<SettingKey, StringTranslationKey> = {
  density: 'displayDensity',
  unitSize: 'unitSize',
  theme: 'theme',
  language: 'language',
};

const SettingOptionScreen: React.FC<SettingOptionScreenProps> = ({ navigation, route }) => {
  const { key } = route.params;
  const { colors } = useTheme();
  const { spacing, font, radius } = useDensity();
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { unitSize, theme, language, density } = useSelector((state: RootState) => state.settings);

  useEffect(() => {
    navigation.setOptions({ title: t[TITLE_KEYS[key]] });
  }, [navigation, key, t]);

  // 每个设置项组装成统一的「选项行」
  let items: { label: string; selected: boolean; onSelect: () => void }[] = [];

  if (key === 'density') {
    items = DENSITY_OPTIONS.map((opt) => ({
      label: t[opt.labelKey],
      selected: density === opt.value,
      onSelect: () => {
        dispatch(setDensity(opt.value));
        dispatch(updateSettings({ density: opt.value }));
      },
    }));
  } else if (key === 'theme') {
    items = THEME_OPTIONS.map((opt) => ({
      label: t[opt.labelKey],
      selected: theme === opt.value,
      onSelect: () => {
        dispatch(setTheme(opt.value));
        dispatch(updateSettings({ theme: opt.value }));
      },
    }));
  } else if (key === 'language') {
    items = LANGUAGE_OPTIONS.map((opt) => ({
      label: t[opt.labelKey],
      selected: language === opt.value,
      onSelect: () => {
        dispatch(setLanguage(opt.value));
        dispatch(updateSettings({ language: opt.value }));
      },
    }));
  } else {
    items = UNIT_SIZE_OPTIONS.map((size) => ({
      label: String(size),
      selected: unitSize === size,
      onSelect: () => {
        dispatch(setUnitSize(size));
        dispatch(updateSettings({ unitSize: size }));
      },
    }));
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      contentContainerStyle={[styles.content, { padding: 16 * spacing, paddingTop: 0, paddingBottom: 40 * spacing }]}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: 16 * radius, paddingHorizontal: 16 * spacing }]}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.row,
              {
                paddingVertical: 16 * spacing,
                borderBottomColor: colors.borderLight,
                borderBottomWidth: index === items.length - 1 ? 0 : StyleSheet.hairlineWidth,
              },
            ]}
            onPress={item.onSelect}
            activeOpacity={0.7}
          >
            <Text style={[styles.rowLabel, { color: colors.text, fontSize: 16 * font }]}>{item.label}</Text>
            {item.selected && <Ionicons name="checkmark" size={20 * font} color={colors.accent} />}
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
  card: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 16,
  },
});

export default SettingOptionScreen;

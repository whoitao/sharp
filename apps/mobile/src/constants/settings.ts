import type { Density, Language, Theme } from '@sharp/shared';
import type { StringTranslationKey } from '../i18n/zh';

/** 设置二级页对应的设置项 */
export type SettingKey = 'density' | 'unitSize' | 'theme' | 'language' | 'textbook';

export const UNIT_SIZE_OPTIONS = [20, 30, 50, 100] as const;

export const THEME_OPTIONS: { value: Theme; labelKey: StringTranslationKey }[] = [
  { value: 'light' as Theme, labelKey: 'light' },
  { value: 'dark' as Theme, labelKey: 'dark' },
  { value: 'system' as Theme, labelKey: 'system' },
];

export const LANGUAGE_OPTIONS: { value: Language; labelKey: StringTranslationKey }[] = [
  { value: 'zh' as Language, labelKey: 'chinese' },
  { value: 'en' as Language, labelKey: 'english' },
];

export const DENSITY_OPTIONS: { value: Density; labelKey: StringTranslationKey }[] = [
  { value: 'compact' as Density, labelKey: 'densityCompact' },
  { value: 'comfortable' as Density, labelKey: 'densityComfortable' },
  { value: 'spacious' as Density, labelKey: 'densitySpacious' },
];

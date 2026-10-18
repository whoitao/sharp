import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../stores';
import { lightColors, darkColors, type ThemeColors } from '../theme/colors';

export const useTheme = (): { colors: ThemeColors; isDark: boolean } => {
  const theme = useSelector((state: RootState) => state.settings.theme);
  const systemScheme = useColorScheme();

  const isDark =
    theme === 'dark' || (theme === 'system' && systemScheme === 'dark');

  return {
    colors: isDark ? darkColors : lightColors,
    isDark,
  };
};

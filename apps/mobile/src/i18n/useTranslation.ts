import { useSelector } from 'react-redux';
import type { RootState } from '../stores';
import { zh, type TranslationKeys } from './zh';
import { en } from './en';

const translations: Record<string, TranslationKeys> = {
  zh,
  en,
};

export const useTranslation = () => {
  const language = useSelector((state: RootState) => state.settings.language);
  const t = translations[language] ?? zh;

  return { t, language };
};

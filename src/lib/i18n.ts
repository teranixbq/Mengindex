import { en } from './i18n/en';
import { id } from './i18n/id';
import type { Language, Translations } from './i18n/types';
import { zh } from './i18n/zh';

export {
  DEFAULT_LANGUAGE,
  getLocaleForLanguage,
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  loadSavedLanguage,
  type Language,
  type Translations,
} from './i18n/types';

export const TRANSLATIONS: Record<Language, Translations> = {
  en,
  id,
  zh,
};

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import RNRestart from 'react-native-restart';
import en from './locales/en';
import ar from './locales/ar';

export type SupportedLanguage = 'en' | 'ar';

export const RTL_LANGUAGES: SupportedLanguage[] = ['ar'];

export function isRtlLanguage(language: SupportedLanguage): boolean {
  return RTL_LANGUAGES.includes(language);
}

let initialized = false;

export function initI18n(language: SupportedLanguage): void {
  if (initialized) {
    return;
  }
  initialized = true;
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
}

/**
 * Switches the active language. RTL mirroring requires a full JS reload to
 * take effect on native layout, so the caller must expect the app to restart
 * after this resolves. This must never run silently during first launch —
 * onboarding sets the initial language before any screen mounts, so no
 * restart is needed there.
 */
export async function changeLanguage(language: SupportedLanguage): Promise<void> {
  const shouldBeRtl = isRtlLanguage(language);
  const needsRestart = I18nManager.isRTL !== shouldBeRtl;

  await i18n.changeLanguage(language);

  if (needsRestart) {
    I18nManager.allowRTL(shouldBeRtl);
    I18nManager.forceRTL(shouldBeRtl);
    RNRestart.restart();
  }
}

export default i18n;

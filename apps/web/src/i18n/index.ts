import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const savedLang = localStorage.getItem('lang') || 'tr';

// Lazy-load language bundles to reduce unused JS in initial payload
// Only the active language is loaded synchronously; the other loads on demand
const loadResources = async () => {
  const resources: Record<string, { translation: Record<string, unknown> }> = {};

  if (savedLang === 'tr') {
    const tr = (await import('./tr.json')).default;
    resources.tr = { translation: tr };
    // Lazy-load English in the background
    import('./en.json').then(({ default: en }) => {
      i18n.addResourceBundle('en', 'translation', en, true, true);
    });
  } else {
    const en = (await import('./en.json')).default;
    resources.en = { translation: en };
    // Lazy-load Turkish in the background
    import('./tr.json').then(({ default: tr }) => {
      i18n.addResourceBundle('tr', 'translation', tr, true, true);
    });
  }

  return resources;
};

// Initialize with the active language first for fast startup
const initI18n = async () => {
  const resources = await loadResources();

  await i18n.use(initReactI18next).init({
    resources,
    lng: savedLang,
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false,
    },
  });
};

initI18n();

// Update HTML lang attribute when language changes
const updateLang = (lng: string) => {
  document.documentElement.lang = lng;
};
updateLang(savedLang);
i18n.on('languageChanged', updateLang);

export default i18n;

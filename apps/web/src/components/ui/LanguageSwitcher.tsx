import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  function toggle() {
    const next = i18n.language === 'tr' ? 'en' : 'tr';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  }

  return (
    <button
      onClick={toggle}
      className="px-2 py-1 text-xs font-medium border border-gray-200 rounded-md hover:bg-gray-50 uppercase"
      title={i18n.language === 'tr' ? 'Switch to English' : 'Türkçeye geç'}
    >
      {i18n.language === 'tr' ? 'EN' : 'TR'}
    </button>
  );
}

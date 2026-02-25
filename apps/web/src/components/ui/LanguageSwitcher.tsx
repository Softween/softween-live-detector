import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language;

  function toggle() {
    const next = current === 'tr' ? 'en' : 'tr';
    i18n.changeLanguage(next);
  }

  return (
    <button
      onClick={toggle}
      className="px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-300 bg-white/[0.04] border border-white/[0.06] rounded-md transition-colors"
    >
      {current === 'tr' ? 'EN' : 'TR'}
    </button>
  );
}

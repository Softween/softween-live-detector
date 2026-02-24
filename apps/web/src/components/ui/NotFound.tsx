import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] px-4 text-center">
      <p className="text-8xl font-bold text-zinc-800">404</p>
      <h1 className="mt-4 text-xl font-semibold text-zinc-100">{t('notFound.title')}</h1>
      <p className="mt-2 text-sm text-zinc-500 max-w-md">{t('notFound.description')}</p>
      <Link to="/dashboard" className="mt-8 btn-primary">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        {t('notFound.backToDashboard')}
      </Link>
    </div>
  );
}

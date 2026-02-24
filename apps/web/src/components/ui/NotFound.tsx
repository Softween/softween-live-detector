import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <p className="text-7xl font-bold text-gray-200">404</p>

      <h1 className="mt-4 text-2xl font-semibold text-gray-900">
        {t('notFound.title')}
      </h1>

      <p className="mt-2 text-sm text-gray-600 max-w-md">
        {t('notFound.description')}
      </p>

      <Link
        to="/dashboard"
        className="mt-8 inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        {t('notFound.backToDashboard')}
      </Link>
    </div>
  );
}

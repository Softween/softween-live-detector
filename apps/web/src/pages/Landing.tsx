import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';

export default function Landing() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-semibold">{t('common.appName')}</span>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/login" className="text-sm px-4 py-2 text-gray-700 hover:text-gray-900">
              {t('landing.login')}
            </Link>
            <Link
              to="/register"
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('landing.register')}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {t('landing.title')}
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          {t('landing.subtitle')}
        </p>

        <div className="flex justify-center gap-4 mb-16">
          <Link
            to="/register"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            {t('landing.cta')}
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-left">
          <div className="p-6 rounded-xl bg-gray-50">
            <div className="text-2xl mb-3">🔍</div>
            <h3 className="font-semibold mb-2">{t('landing.feature1Title')}</h3>
            <p className="text-sm text-gray-600">{t('landing.feature1Desc')}</p>
          </div>
          <div className="p-6 rounded-xl bg-gray-50">
            <div className="text-2xl mb-3">📧</div>
            <h3 className="font-semibold mb-2">{t('landing.feature2Title')}</h3>
            <p className="text-sm text-gray-600">{t('landing.feature2Desc')}</p>
          </div>
          <div className="p-6 rounded-xl bg-gray-50">
            <div className="text-2xl mb-3">📊</div>
            <h3 className="font-semibold mb-2">{t('landing.feature3Title')}</h3>
            <p className="text-sm text-gray-600">{t('landing.feature3Desc')}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

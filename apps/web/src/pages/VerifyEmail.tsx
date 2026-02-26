import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSEO } from '../hooks/useSEO';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import Spinner from '../components/ui/Spinner';

export default function VerifyEmail() {
  const { t } = useTranslation();
  useSEO({ title: 'Verify Email', noindex: true });
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    api.auth.verifyEmail(token)
      .then(() => {
        setStatus('success');
        refreshUser();
      })
      .catch(() => setStatus('error'));
  }, [token, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4 relative">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
      <div className="w-full max-w-[360px] relative z-10 text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <Spinner size="md" />
            <p className="text-zinc-400">{t('auth.verifyingEmail')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">{t('auth.emailVerified')}</h1>
            <p className="text-sm text-zinc-500">{t('auth.emailVerifiedDesc')}</p>
            <Link to="/dashboard" className="btn-primary inline-block mt-4">
              {t('notFound.backToDashboard')}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">{t('auth.verificationFailed')}</h1>
            <p className="text-sm text-zinc-500">{t('auth.verificationFailedDesc')}</p>
            <Link to="/dashboard" className="text-violet-400 hover:text-violet-300 font-medium text-sm">
              {t('notFound.backToDashboard')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

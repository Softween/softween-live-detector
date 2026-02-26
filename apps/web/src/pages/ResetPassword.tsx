import { useState, type FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSEO } from '../hooks/useSEO';
import { api } from '../api/client';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';

export default function ResetPassword() {
  const { t } = useTranslation();
  useSEO({ title: 'Reset Password', noindex: true });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      await api.auth.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">{t('auth.invalidResetToken')}</p>
          <Link to="/forgot-password" className="text-violet-400 hover:text-violet-300 font-medium">
            {t('auth.requestNewReset')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4 relative">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-violet-500/[0.05] via-transparent to-transparent" />

      <div className="w-full max-w-[360px] relative z-10">
        <div className="flex justify-between items-center mb-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight">{t('common.appName')}</span>
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{t('auth.resetPasswordTitle')}</h1>
          <p className="text-sm text-zinc-500 mt-2">{t('auth.resetPasswordSubtitle')}</p>
        </div>

        {success ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-sm rounded-lg">
            <p className="font-medium mb-1">{t('auth.passwordResetSuccess')}</p>
            <p className="text-emerald-400/70 text-xs">{t('auth.redirectingToLogin')}</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-5 p-3 bg-red-500/10 border border-red-500/15 text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">{t('auth.newPassword')}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="input" />
                <p className="text-xs text-zinc-600 mt-1">{t('auth.passwordHint')}</p>
              </div>
              <div>
                <label className="label">{t('auth.passwordConfirm')}</label>
                <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required minLength={8} className="input" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? t('common.loading') : t('auth.resetPasswordButton')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useSEO } from '../hooks/useSEO';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';

export default function Login() {
  const { t } = useTranslation();
  useSEO({ title: 'Sign In', noindex: true });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-bold tracking-tight">{t('auth.loginTitle')}</h1>
          <p className="text-sm text-zinc-500 mt-2">{t('auth.loginSubtitle')}</p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-500/10 border border-red-500/15 text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{t('auth.email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" />
          </div>
          <div>
            <label className="label">{t('auth.password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? t('auth.loggingIn') : t('auth.loginButton')}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-500">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">
            {t('auth.registerButton')}
          </Link>
        </p>
      </div>
    </div>
  );
}

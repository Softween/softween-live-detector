import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';

export default function Register() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-zinc-100">{t('common.appName')}</span>
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-zinc-100">{t('auth.registerTitle')}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t('auth.registerSubtitle')}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{t('auth.name')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input" />
          </div>
          <div>
            <label className="label">{t('auth.email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input" />
          </div>
          <div>
            <label className="label">{t('auth.password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="input" />
            <p className="text-xs text-zinc-600 mt-1">{t('auth.passwordHint')}</p>
          </div>
          <div>
            <label className="label">{t('auth.passwordConfirm')}</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className="input" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? t('auth.registering') : t('auth.registerButton')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
            {t('auth.loginButton')}
          </Link>
        </p>
      </div>
    </div>
  );
}

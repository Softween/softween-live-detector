import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useTheme } from '../../context/ThemeContext';

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  async function handleLogout() {
    await logout();
    window.location.href = '/';
  }

  function isActive(path: string) {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      <header className="border-b border-white/[0.04] bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight">{t('common.appName')}</span>
            </Link>

            <nav className="hidden sm:flex items-center">
              <Link
                to="/dashboard"
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  isActive('/dashboard')
                    ? 'text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                to="/settings"
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  isActive('/settings')
                    ? 'text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t('nav.settings')}
              </Link>
              <Link
                to="/groups"
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  isActive('/groups')
                    ? 'text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Gruplar
              </Link>
              <Link
                to="/heartbeats"
                className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  isActive('/heartbeats')
                    ? 'text-zinc-100'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t('nav.heartbeats')}
              </Link>
              <Link
                to="/turkiye"
                className="px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors text-zinc-500 hover:text-zinc-300"
              >
                {t('nav.turkey', { defaultValue: 'T\u00fcrkiye' })}
              </Link>
            </nav>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md hover:bg-zinc-800/60 transition-colors text-zinc-500 hover:text-zinc-200"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
              )}
            </button>
            <LanguageSwitcher />
            <div className="h-4 w-px bg-white/[0.06]" />
            <span className="text-xs text-zinc-500">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              {t('nav.logout')}
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-1.5 rounded-md hover:bg-zinc-800/60 transition-colors"
            aria-label={t('nav.menu')}
          >
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/[0.04] bg-[#09090b] animate-fade-in">
            <div className="px-4 py-3 space-y-1">
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm ${
                  isActive('/dashboard') ? 'text-zinc-100 bg-white/[0.04]' : 'text-zinc-400'
                }`}
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm ${
                  isActive('/settings') ? 'text-zinc-100 bg-white/[0.04]' : 'text-zinc-400'
                }`}
              >
                {t('nav.settings')}
              </Link>
              <Link
                to="/groups"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm ${
                  isActive('/groups') ? 'text-zinc-100 bg-white/[0.04]' : 'text-zinc-400'
                }`}
              >
                Gruplar
              </Link>
              <Link
                to="/heartbeats"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm ${
                  isActive('/heartbeats') ? 'text-zinc-100 bg-white/[0.04]' : 'text-zinc-400'
                }`}
              >
                {t('nav.heartbeats')}
              </Link>
              <Link
                to="/turkiye"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-zinc-400"
              >
                {t('nav.turkey', { defaultValue: 'T\u00fcrkiye' })}
              </Link>
              <div className="border-t border-white/[0.04] pt-2 mt-2 flex items-center justify-between px-3">
                <span className="text-xs text-zinc-500">{user?.name}</span>
                <div className="flex items-center gap-3">
                  <LanguageSwitcher />
                  <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300">
                    {t('nav.logout')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { useSEO } from '../hooks/useSEO';

export default function Landing() {
  const { t, i18n } = useTranslation();

  useSEO({
    title: i18n.language === 'tr'
      ? 'Ücretsiz Uptime İzleme & Durum Sayfaları'
      : 'Free Uptime Monitoring & Status Pages',
    description: i18n.language === 'tr'
      ? 'Web sitelerinizi 5 dakika aralıklarla izleyin. Siteleriniz çökünce anında e-posta, Discord ve Slack bildirimi alın. Ücretsiz durum sayfaları, 90 günlük geçmiş ve gömülebilir rozetler.'
      : 'Monitor your websites with 5-minute interval checks. Get instant email, Discord & Slack alerts when sites go down. Free public status pages, 90-day uptime history, and embeddable badges.',
    ogType: 'website',
  });

  return (
    <div className="min-h-screen bg-[#09090b] relative overflow-hidden">
      {/* Ambient grid + radial glow */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-violet-500/[0.07] via-transparent to-transparent" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight">{t('common.appName')}</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link to="/login" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
              {t('landing.login')}
            </Link>
            <Link to="/register" className="btn-primary text-xs px-3.5 py-1.5">
              {t('landing.register')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-36 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.03] text-xs text-zinc-400 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          {t('landing.badge')}
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gradient leading-[1.1]">
          {t('landing.title')}
        </h1>

        <p className="mt-6 text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
          {t('landing.subtitle')}
        </p>

        <div className="flex justify-center gap-3 mt-10">
          <Link to="/register" className="btn-primary px-6 py-3 text-sm">
            {t('landing.cta')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link to="/login" className="btn-secondary px-6 py-3 text-sm">
            {t('landing.login')}
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px mt-20 rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
          {[
            { value: t('landing.heroStat1'), label: t('landing.heroStat1Label') },
            { value: t('landing.heroStat2'), label: t('landing.heroStat2Label') },
            { value: t('landing.heroStat3'), label: t('landing.heroStat3Label') },
          ].map((stat, i) => (
            <div key={stat.label} className={`py-6 px-4 text-center ${i > 0 ? 'border-l border-white/[0.06]' : ''}`}>
              <div className="text-2xl sm:text-3xl font-bold text-zinc-100 tabular-nums">{stat.value}</div>
              <div className="text-xs text-zinc-500 mt-1.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        <h2 className="sr-only">Features</h2>
        <div className="grid sm:grid-cols-2 gap-4 mt-20 text-left">
          {[
            {
              title: t('landing.feature1Title'),
              desc: t('landing.feature1Desc'),
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
            },
            {
              title: t('landing.feature2Title'),
              desc: t('landing.feature2Desc'),
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />,
            },
            {
              title: t('landing.feature3Title'),
              desc: t('landing.feature3Desc'),
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />,
            },
            {
              title: t('landing.feature4Title'),
              desc: t('landing.feature4Desc'),
              icon: <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />,
            },
          ].map((feature) => (
            <div key={feature.title} className="group p-6 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 group-hover:bg-violet-500/15 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  {feature.icon}
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-zinc-100 mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Turkey Dashboard Banner */}
        <Link
          to="/turkiye"
          className="group mt-16 block rounded-xl border border-violet-500/20 bg-violet-500/[0.04] hover:bg-violet-500/[0.08] hover:border-violet-500/30 transition-all duration-300 p-5 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors">
              {i18n.language === 'tr'
                ? "T\u00fcrkiye'nin en pop\u00fcler sitelerinin durumunu g\u00f6r\u00fcn"
                : "View the status of Turkey's most popular websites"}
            </span>
            <svg className="w-4 h-4 text-violet-400 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
          <p className="text-xs text-zinc-500">
            {i18n.language === 'tr'
              ? 'E-ticaret, bankac\u0131l\u0131k, sosyal medya ve daha fazlas\u0131'
              : 'E-commerce, banking, social media and more'}
          </p>
        </Link>

        <p className="mt-12 text-xs text-zinc-600">{t('landing.trustedBy')}</p>
      </main>
    </div>
  );
}

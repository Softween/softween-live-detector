import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TurkeyDashboard as TurkeyDashboardType } from 'shared';
import { api } from '../api/client';
import TurkeySiteCard from '../components/ui/TurkeySiteCard';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import Spinner from '../components/ui/Spinner';
import { Skeleton } from '../components/ui/Skeleton';
import { useSEO } from '../hooks/useSEO';

const CATEGORY_ICONS: Record<string, string> = {
  ecommerce: '\uD83D\uDED2',
  banking: '\uD83C\uDFE6',
  social: '\uD83D\uDCAC',
  news: '\uD83D\uDCF0',
  gov: '\uD83C\uDFDB\uFE0F',
  telecom: '\uD83D\uDCE1',
  food: '\uD83C\uDF54',
  travel: '\u2708\uFE0F',
  tech: '\uD83D\uDCBB',
};

const REFRESH_INTERVAL = 60_000;

export default function TurkeyDashboard() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [data, setData] = useState<TurkeyDashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [copied, setCopied] = useState(false);

  useSEO({
    title: lang === 'tr'
      ? 'T\u00fcrkiye Site Durum Paneli - Anl\u0131k \u0130zleme'
      : 'Turkey Site Status Dashboard - Real-time Monitoring',
    description: lang === 'tr'
      ? 'T\u00fcrkiye\'nin en pop\u00fcler sitelerinin anl\u0131k durumu. E-ticaret, bankac\u0131l\u0131k, sosyal medya ve daha fazlas\u0131.'
      : 'Real-time status of Turkey\'s most popular websites. E-commerce, banking, social media and more.',
  });

  const fetchData = useCallback(() => {
    api.turkey.getDashboard()
      .then((d) => {
        setData(d);
        setSecondsAgo(0);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  function getStatusConfig(status: TurkeyDashboardType['overall_status']) {
    switch (status) {
      case 'all_up':
        return {
          color: 'emerald',
          bgClass: 'border-emerald-500/20 bg-emerald-500/[0.06]',
          dotClass: 'bg-emerald-400',
          dotSolidClass: 'bg-emerald-500',
          label: t('turkey.allUp'),
        };
      case 'some_down':
        return {
          color: 'yellow',
          bgClass: 'border-yellow-500/20 bg-yellow-500/[0.06]',
          dotClass: 'bg-yellow-400',
          dotSolidClass: 'bg-yellow-500',
          label: t('turkey.someDown'),
        };
      case 'major_outage':
        return {
          color: 'red',
          bgClass: 'border-red-500/20 bg-red-500/[0.06]',
          dotClass: 'bg-red-400',
          dotSolidClass: 'bg-red-500',
          label: t('turkey.majorOutage'),
        };
    }
  }

  function formatDuration(minutes: number | null): string {
    if (minutes === null) return t('turkey.ongoing');
    if (minutes < 60) return `${minutes} dk`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  function handleShare(platform: 'twitter' | 'whatsapp' | 'copy') {
    const url = window.location.href;
    const text = lang === 'tr'
      ? 'T\u00fcrkiye\'nin en pop\u00fcler sitelerinin anl\u0131k durumu \uD83C\uDDF9\uD83C\uDDF7'
      : 'Real-time status of Turkey\'s popular websites \uD83C\uDDF9\uD83C\uDDF7';

    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-violet-500/[0.07] via-transparent to-transparent" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-center justify-center mb-12">
            <Spinner size="md" />
          </div>
          <div className="grid gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-zinc-100 mb-2">{t('common.error')}</h1>
          <button onClick={fetchData} className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
            {t('error.retry')}
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(data.overall_status);

  return (
    <div className="min-h-screen bg-[#09090b] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-violet-500/[0.07] via-transparent to-transparent" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
            </Link>
            <div className="h-5 w-px bg-white/[0.06]" />
            <span className="text-sm font-semibold tracking-tight text-zinc-100">{t('turkey.title')}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/blog" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Blog
            </Link>
            <Link to="/login" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              {t('landing.login')}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Subtitle */}
        <p className="text-sm text-zinc-500 mb-8">{t('turkey.subtitle')}</p>

        {/* Overall status hero */}
        <div className={`rounded-xl border p-6 mb-8 ${statusConfig.bgClass}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.dotClass}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${statusConfig.dotSolidClass}`} />
              </span>
              <span className="text-lg font-semibold text-zinc-100">{statusConfig.label}</span>
            </div>
            <span className="text-xs text-zinc-500">
              {t('turkey.lastUpdated')}: {secondsAgo}s
            </span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden mb-10">
          {[
            { value: data.total_sites, label: t('turkey.sitesMonitored') },
            { value: data.sites_up, label: t('turkey.sitesUp'), color: 'text-emerald-400' },
            { value: data.sites_down, label: t('turkey.sitesDown'), color: data.sites_down > 0 ? 'text-red-400' : 'text-zinc-100' },
            { value: `${Math.round(data.avg_response_time_ms)}ms`, label: t('turkey.avgResponse') },
          ].map((stat, i) => (
            <div key={stat.label} className={`py-5 px-4 text-center ${i > 0 ? 'border-l border-white/[0.06]' : ''}`}>
              <div className={`text-2xl font-bold tabular-nums ${stat.color || 'text-zinc-100'}`}>{stat.value}</div>
              <div className="text-[11px] text-zinc-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Category sections */}
        {data.categories.map((category) => (
          <section key={category.name} className="mb-10">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200 mb-4">
              <span className="text-lg">{CATEGORY_ICONS[category.name] || '\uD83C\uDF10'}</span>
              {lang === 'tr' ? category.label_tr : category.label_en}
              <span className="text-xs text-zinc-600 font-normal">({category.sites.length})</span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {category.sites.map((site) => (
                <TurkeySiteCard
                  key={site.id}
                  name={site.name}
                  url={site.url}
                  status={site.current_status}
                  responseTime={site.response_time_ms}
                  uptimePercentage={site.uptime_percentage}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Recent incidents */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4">{t('turkey.recentIncidents')}</h2>
          {data.recent_incidents.length === 0 ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
              <span className="text-sm text-zinc-500">{t('turkey.noIncidents')}</span>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Site</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 hidden sm:table-cell">{t('detail.incidentStarted')}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">{t('turkey.duration')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_incidents.map((incident, i) => (
                    <tr key={i} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex rounded-full h-1.5 w-1.5 ${incident.resolved_at ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span className="text-zinc-200">{incident.site_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">
                        {new Date(incident.started_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={incident.resolved_at ? 'text-zinc-500' : 'text-red-400 font-medium'}>
                          {formatDuration(incident.duration_minutes)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Social share buttons */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => handleShare('twitter')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-zinc-400 hover:text-zinc-200 transition-all"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Twitter
          </button>
          <button
            onClick={() => handleShare('whatsapp')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-zinc-400 hover:text-zinc-200 transition-all"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>
          <button
            onClick={() => handleShare('copy')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-zinc-400 hover:text-zinc-200 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.854a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L5.88 8.172" />
            </svg>
            {copied ? t('common.copied') : t('common.copy')}
          </button>
        </div>

        {/* CTA banner */}
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-8 text-center mb-10">
          <h3 className="text-lg font-semibold text-zinc-100 mb-2">{t('turkey.monitorYourSite')}</h3>
          <p className="text-sm text-zinc-400 mb-5 max-w-md mx-auto">
            {lang === 'tr'
              ? '5 dakikada bir otomatik kontrol, anl\u0131k bildirimler ve detayl\u0131 analitik.'
              : 'Automated checks every 5 minutes, instant alerts, and detailed analytics.'}
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            {t('landing.cta')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {/* Footer */}
        <footer className="text-center pb-8">
          <p className="text-[11px] text-zinc-600">
            {t('turkey.poweredBy')} &middot;{' '}
            <Link to="/" className="text-violet-500/70 hover:text-violet-400 transition-colors">
              LiveDetector
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

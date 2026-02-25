import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { StatusPagePublic } from 'shared';
import { api } from '../api/client';
import UptimeBar from '../components/ui/UptimeBar';
import Spinner from '../components/ui/Spinner';

export default function StatusPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<StatusPagePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.statusPage.getPublic(slug)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-zinc-100 mb-2">{t('statusPage.notFound')}</h1>
          <p className="text-sm text-zinc-500">{t('statusPage.notFoundDesc')}</p>
        </div>
      </div>
    );
  }

  const allUp = data.monitors.every((m) => m.current_status === 'up');
  const someDown = data.monitors.some((m) => m.current_status === 'down');

  return (
    <div className="min-h-screen bg-[#09090b] relative">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-violet-500/[0.05] via-transparent to-transparent" />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">{data.title}</span>
        </div>

        {data.description && (
          <p className="text-sm text-zinc-500 mb-8">{data.description}</p>
        )}

        {/* Overall status banner */}
        <div className={`rounded-xl border p-4 mb-8 ${
          allUp
            ? 'border-emerald-500/20 bg-emerald-500/[0.06]'
            : someDown
              ? 'border-red-500/20 bg-red-500/[0.06]'
              : 'border-yellow-500/20 bg-yellow-500/[0.06]'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                allUp ? 'bg-emerald-400' : someDown ? 'bg-red-400' : 'bg-yellow-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                allUp ? 'bg-emerald-500' : someDown ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
            </span>
            <span className="text-sm font-medium text-zinc-100">
              {allUp ? t('statusPage.allOperational') : someDown ? t('statusPage.someDown') : t('statusPage.someIssues')}
            </span>
          </div>
        </div>

        {/* Monitor list */}
        <div className="space-y-4">
          {data.monitors.map((monitor) => (
            <div key={monitor.name} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={
                    monitor.current_status === 'up' ? 'dot-up'
                      : monitor.current_status === 'down' ? 'dot-down'
                        : 'dot-unknown'
                  } />
                  <span className="text-sm font-medium text-zinc-200">{monitor.name}</span>
                </div>
                <span className="text-xs text-zinc-500 tabular-nums">{monitor.uptime_percentage}% {t('statusPage.uptime')}</span>
              </div>
              <UptimeBar data={monitor.daily_uptime} />
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-zinc-600">{t('statusPage.days90ago')}</span>
                <span className="text-[10px] text-zinc-600">{t('statusPage.today')}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-[11px] text-zinc-600">
          {t('statusPage.poweredBy')}
        </p>
      </div>
    </div>
  );
}

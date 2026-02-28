import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { StatusPagePublic } from 'shared';
import { api } from '../api/client';
import UptimeBar from '../components/ui/UptimeBar';
import Spinner from '../components/ui/Spinner';
import { useSEO } from '../hooks/useSEO';

const STATUS_CONFIG = {
  operational: { label: 'All Systems Operational', labelTr: 'Tüm Sistemler Çalışıyor', color: 'emerald', bg: 'from-emerald-500/10 to-emerald-500/5' },
  degraded: { label: 'Partial System Outage', labelTr: 'Kısmi Sistem Kesintisi', color: 'yellow', bg: 'from-yellow-500/10 to-yellow-500/5' },
  major_outage: { label: 'Major System Outage', labelTr: 'Büyük Sistem Kesintisi', color: 'red', bg: 'from-red-500/10 to-red-500/5' },
  maintenance: { label: 'Under Maintenance', labelTr: 'Bakım Yapılıyor', color: 'blue', bg: 'from-blue-500/10 to-blue-500/5' },
};

export default function StatusPage() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<StatusPagePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.statusPage.getPublic(slug)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!slug || !subscribeEmail) return;
    setSubscribing(true);
    try {
      await api.statusPage.subscribe(slug, subscribeEmail);
      setSubscribed(true);
    } catch {
      // silent
    } finally {
      setSubscribing(false);
    }
  }

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

  useSEO({
    title: `${data.title} - Status`,
    description: data.description || `Current status of ${data.title} services`,
  });

  const isTr = i18n.language === 'tr';
  const statusInfo = STATUS_CONFIG[data.overall_status];
  const dotColor = statusInfo.color === 'emerald' ? 'bg-emerald-500' : statusInfo.color === 'yellow' ? 'bg-yellow-500' : statusInfo.color === 'red' ? 'bg-red-500' : 'bg-blue-500';
  const pingColor = statusInfo.color === 'emerald' ? 'bg-emerald-400' : statusInfo.color === 'yellow' ? 'bg-yellow-400' : statusInfo.color === 'red' ? 'bg-red-400' : 'bg-blue-400';

  return (
    <div className="min-h-screen bg-[#09090b] relative">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-violet-500/[0.05] via-transparent to-transparent" />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-2">
          {data.logo_url ? (
            <img src={data.logo_url} alt="" className="w-6 h-6 rounded-md object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
          )}
          <span className="text-sm font-semibold tracking-tight text-zinc-100">{data.title}</span>
        </div>

        {data.description && (
          <p className="text-sm text-zinc-500 mb-8">{data.description}</p>
        )}

        {/* Overall status banner */}
        <div className={`rounded-xl border p-5 mb-10 bg-gradient-to-r ${statusInfo.bg} ${
          statusInfo.color === 'emerald' ? 'border-emerald-500/20' :
          statusInfo.color === 'yellow' ? 'border-yellow-500/20' :
          statusInfo.color === 'red' ? 'border-red-500/20' : 'border-blue-500/20'
        }`}>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pingColor}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${dotColor}`} />
            </span>
            <span className="text-base font-semibold text-zinc-100">
              {isTr ? statusInfo.labelTr : statusInfo.label}
            </span>
          </div>
        </div>

        {/* Grouped monitors */}
        <div className="space-y-8">
          {data.groups.map((group) => (
            <div key={group.id || 'ungrouped'}>
              {/* Group header */}
              {data.groups.length > 1 && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{group.name}</span>
                </div>
              )}

              {/* Monitor rows */}
              <div className="space-y-4">
                {group.monitors.map((monitor) => (
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
                      <span className="text-xs text-zinc-500 tabular-nums font-medium">
                        {monitor.uptime_percentage}%
                      </span>
                    </div>
                    <UptimeBar data={monitor.daily_uptime} />
                    <div className="flex justify-between mt-2">
                      <span className="text-[10px] text-zinc-600">{t('statusPage.days90ago')}</span>
                      <span className="text-[10px] text-zinc-600">{t('statusPage.today')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Incident Timeline */}
        {data.incidents && data.incidents.length > 0 && (
          <div className="mt-12">
            <h2 className="text-sm font-semibold text-zinc-200 mb-4">
              {isTr ? 'Son Olaylar' : 'Recent Incidents'}
            </h2>
            <div className="space-y-4">
              {data.incidents.map((incident, idx) => (
                <div key={idx} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={incident.resolved_at ? 'w-2 h-2 rounded-full bg-emerald-500' : 'w-2 h-2 rounded-full bg-red-500'} />
                      <span className="text-sm font-medium text-zinc-200">{incident.monitor_name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600 tabular-nums">
                      {new Date(incident.started_at + 'Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {incident.cause && (
                    <p className="text-xs text-zinc-500 mb-2">{incident.cause}</p>
                  )}
                  {incident.updates && incident.updates.length > 0 && (
                    <div className="border-l-2 border-white/[0.06] ml-1 pl-3 space-y-2 mt-3">
                      {incident.updates.map((update) => (
                        <div key={update.id}>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                              update.status === 'resolved' ? 'text-emerald-400' :
                              update.status === 'monitoring' ? 'text-blue-400' :
                              update.status === 'identified' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {update.status}
                            </span>
                            <span className="text-[10px] text-zinc-700">
                              {new Date(update.created_at + 'Z').toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">{update.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subscribe form */}
        {data.show_subscribe === 1 && (
          <div className="mt-12 card p-5">
            <h3 className="text-sm font-semibold text-zinc-200 mb-1">
              {isTr ? 'Güncellemelerden Haberdar Olun' : 'Subscribe to Updates'}
            </h3>
            <p className="text-xs text-zinc-500 mb-3">
              {isTr ? 'Durum değişikliklerinde email alın' : 'Get notified when status changes'}
            </p>
            {subscribed ? (
              <p className="text-sm text-emerald-400">
                {isTr ? 'Abone oldunuz!' : 'Subscribed!'}
              </p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={subscribeEmail}
                  onChange={(e) => setSubscribeEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="input flex-1 text-sm"
                />
                <button type="submit" disabled={subscribing} className="btn-primary text-xs whitespace-nowrap">
                  {subscribing ? '...' : isTr ? 'Abone Ol' : 'Subscribe'}
                </button>
              </form>
            )}
          </div>
        )}

        <p className="mt-12 text-center text-[11px] text-zinc-600">
          {t('statusPage.poweredBy')}
        </p>
      </div>
    </div>
  );
}

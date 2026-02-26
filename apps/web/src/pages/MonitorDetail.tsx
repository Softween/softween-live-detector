import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { Monitor, MonitorStats, Check, DailyUptime } from 'shared';
import { api } from '../api/client';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import UptimeBar from '../components/ui/UptimeBar';
import { StatSkeleton, ChartSkeleton } from '../components/ui/Skeleton';

function formatMs(ms: number | null): string {
  if (ms === null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function MonitorDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dailyUptime, setDailyUptime] = useState<DailyUptime[]>([]);

  useEffect(() => {
    if (!id) return;
    setPage(1);
    setChecks([]);
    loadData();
  }, [id, period]);

  async function loadData() {
    if (!id) return;
    try {
      const [monitorData, statsData, checksData, uptimeData] = await Promise.all([
        api.monitors.get(id),
        api.checks.stats(id, period),
        api.checks.history(id, 1, 50),
        api.checks.dailyUptime(id),
      ]);
      setMonitor(monitorData);
      setStats(statsData);
      setChecks(checksData.data);
      setHasMore(checksData.data.length === 50);
      setDailyUptime(uptimeData);
    } catch {
      toast.error(t('monitor.notFound'));
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreChecks() {
    if (!id || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const checksData = await api.checks.history(id, nextPage, 50);
      setChecks((prev) => [...prev, ...checksData.data]);
      setPage(nextPage);
      setHasMore(checksData.data.length === 50);
    } catch {
      toast.error(t('monitor.loadMoreError'));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handlePing() {
    if (!id || pinging) return;
    setPinging(true);
    try {
      const check = await api.monitors.ping(id);
      if (check.status === 'up') {
        toast.success(t('monitor.pingSuccess', { time: check.response_time_ms }));
      } else {
        toast.error(t('monitor.pingFailed'));
      }
      loadData();
    } catch {
      toast.error(t('monitor.pingError'));
    } finally {
      setPinging(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await api.monitors.delete(id);
      toast.success(t('monitor.deleteSuccess'));
      navigate('/dashboard');
    } catch {
      toast.error(t('monitor.deleteError'));
      setDeleting(false);
      setDeleteModal(false);
    }
  }

  async function handleExport(format: 'csv' | 'json') {
    if (!id) return;
    try {
      const response = await api.checks.exportData(id, format);
      if (!response.ok) {
        toast.error(t('common.error'));
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checks.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('common.error'));
    }
  }

  async function handleToggle() {
    if (!id || !monitor) return;
    setToggling(true);
    try {
      const updated = monitor.is_active
        ? await api.monitors.pause(id)
        : await api.monitors.resume(id);
      setMonitor(updated);
      toast.success(updated.is_active ? t('monitor.resumeSuccess') : t('monitor.pauseSuccess'));
    } catch {
      toast.error(t('monitor.toggleError'));
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-zinc-800/60 rounded animate-pulse" />
            <div className="h-4 w-64 bg-zinc-800/60 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  if (!monitor || !stats) return null;

  const chartData = [...checks]
    .reverse()
    .filter((c) => c.response_time_ms !== null)
    .map((c) => ({
      time: new Date(c.checked_at + 'Z').toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      ms: c.response_time_ms,
    }));

  const statusDuration = monitor.last_checked_at ? getTimeSince(monitor.last_checked_at, t) : null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className={monitor.current_status === 'up' ? 'dot-up' : monitor.current_status === 'down' ? 'dot-down' : 'dot-unknown'} style={{ width: 10, height: 10 }} />
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">{monitor.name}</h1>
            {!monitor.is_active && <span className="badge-paused">{t('monitor.paused')}</span>}
          </div>
          <p className="text-sm text-zinc-500 mt-1.5">{monitor.url}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-zinc-600">
            {statusDuration && <span>{t('monitor.lastCheck')} {statusDuration}</span>}
            <span>{t('detail.method')}: {monitor.method}</span>
            <span>{t('detail.expectedStatus')}: {monitor.expected_status}</span>
            <span>{t('detail.timeoutLabel')}: {monitor.timeout_ms / 1000}s</span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <button onClick={handlePing} disabled={pinging} className="btn-primary text-xs">
            {pinging ? (
              <Spinner size="sm" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
              </svg>
            )}
            {t('monitor.ping')}
          </button>
          <button onClick={handleToggle} disabled={toggling} className="btn-secondary text-xs">
            {toggling ? <Spinner size="sm" /> : monitor.is_active ? t('monitor.pause') : t('monitor.resume')}
          </button>
          <Link to={`/monitors/${monitor.id}/edit`} className="btn-secondary text-xs">
            {t('common.edit')}
          </Link>
          <button onClick={() => setDeleteModal(true)} className="btn-danger text-xs">
            {t('common.delete')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="card p-5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{t('detail.uptime')}</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1.5 tabular-nums">{stats.uptime_percentage}%</div>
        </div>
        <div className="card p-5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{t('detail.avgResponseTime')}</div>
          <div className="text-2xl font-bold text-zinc-100 mt-1.5 tabular-nums">{formatMs(stats.avg_response_time_ms)}</div>
        </div>
        <div className="card p-5">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{t('detail.incidents')}</div>
          <div className="text-2xl font-bold text-red-400 mt-1.5 tabular-nums">{stats.total_incidents}</div>
        </div>
      </div>

      {dailyUptime.length > 0 && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{t('detail.uptimeHistory')}</h3>
            <span className="text-[10px] text-zinc-600">{t('detail.last90days')}</span>
          </div>
          <UptimeBar data={dailyUptime} />
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-zinc-600">90 {t('detail.daysAgoLabel')}</span>
            <span className="text-[10px] text-zinc-600">{t('detail.todayLabel')}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-5">
        <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
          {(['24h', '7d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                period === p
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t(`detail.period${p}`)}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-zinc-600">{t('detail.checkInterval')}</span>
      </div>

      {chartData.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-4">{t('detail.responseTime')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#52525b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#52525b' }} unit="ms" axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(9, 9, 11, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#fafafa',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                }}
              />
              <Line type="monotone" dataKey="ms" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card overflow-hidden">
        <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider p-4 border-b border-white/[0.06]">
          {t('detail.recentChecks')}
        </h3>
        {checks.length === 0 ? (
          <div className="text-center py-10 text-zinc-600 text-sm">{t('detail.noChecks')}</div>
        ) : (
          <>
            <div className="divide-y divide-white/[0.04]">
              {checks.map((check) => (
                <div key={check.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={check.status === 'up' ? 'dot-up' : 'dot-down'} />
                    <span className="text-xs text-zinc-300 truncate tabular-nums">
                      {check.status === 'up'
                        ? `${check.status_code} - ${formatMs(check.response_time_ms)}`
                        : check.error_message}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-600 flex-shrink-0 ml-3 tabular-nums">
                    {new Date(check.checked_at + 'Z').toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="p-3 border-t border-white/[0.06] text-center">
                <button onClick={loadMoreChecks} disabled={loadingMore} className="text-xs text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50">
                  {loadingMore ? <Spinner size="sm" /> : t('detail.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Export */}
      <div className="card p-4 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">{t('detail.exportData')}</div>
            <p className="text-[11px] text-zinc-600">{t('detail.exportDesc')}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0 ml-3">
            <button onClick={() => handleExport('csv')} className="btn-secondary text-xs">CSV</button>
            <button onClick={() => handleExport('json')} className="btn-secondary text-xs">JSON</button>
          </div>
        </div>
      </div>

      {/* Badge embed */}
      <div className="card p-4 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">{t('detail.badge')}</div>
            <code className="text-[11px] text-zinc-400 break-all">
              {`![uptime](${window.location.origin.replace(/:\d+$/, '').replace('livedetector.', 'api.livedetector.')}/api/status-page/badge/${monitor.id})`}
            </code>
          </div>
          <img
            src={`${import.meta.env.VITE_API_URL || ''}/api/status-page/badge/${monitor.id}`}
            alt="uptime badge"
            className="flex-shrink-0 ml-3"
          />
        </div>
      </div>

      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title={t('monitor.deleteTitle')}
        description={t('monitor.deleteConfirm', { name: monitor.name })}
        confirmText={deleting ? t('common.deleting') : t('common.delete')}
        confirmVariant="danger"
      />
    </div>
  );
}

function getTimeSince(dateStr: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(dateStr + 'Z').getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('time.daysAgo', { count: days });
}

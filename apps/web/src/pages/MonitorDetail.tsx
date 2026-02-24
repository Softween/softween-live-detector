import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { Monitor, MonitorStats, Check } from 'shared';
import { api } from '../api/client';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import { StatSkeleton, ChartSkeleton } from '../components/ui/Skeleton';

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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!id) return;
    setPage(1);
    setChecks([]);
    loadData();
  }, [id, period]);

  async function loadData() {
    if (!id) return;
    try {
      const [monitorData, statsData, checksData] = await Promise.all([
        api.monitors.get(id),
        api.checks.stats(id, period),
        api.checks.history(id, 1, 50),
      ]);
      setMonitor(monitorData);
      setStats(statsData);
      setChecks(checksData.data);
      setHasMore(checksData.data.length === 50);
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
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
      time: new Date(c.checked_at + 'Z').toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      ms: c.response_time_ms,
    }));

  const statusDuration = monitor.last_checked_at
    ? getTimeSince(monitor.last_checked_at, t)
    : null;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                monitor.current_status === 'up' ? 'bg-green-500' : monitor.current_status === 'down' ? 'bg-red-500' : 'bg-gray-400'
              }`}
            />
            <h1 className="text-xl font-bold">{monitor.name}</h1>
            {!monitor.is_active && (
              <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                {t('monitor.paused')}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{monitor.url}</p>
          {statusDuration && (
            <p className="text-xs text-gray-400 mt-0.5">
              {t('monitor.lastCheck')} {statusDuration}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {toggling ? <Spinner size="sm" /> : monitor.is_active ? t('monitor.pause') : t('monitor.resume')}
          </button>
          <Link
            to={`/monitors/${monitor.id}/edit`}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            {t('common.edit')}
          </Link>
          <button
            onClick={() => setDeleteModal(true)}
            className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            {t('common.delete')}
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">{t('detail.uptime')}</div>
          <div className="text-2xl font-bold text-green-600">{stats.uptime_percentage}%</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">{t('detail.avgResponseTime')}</div>
          <div className="text-2xl font-bold">{stats.avg_response_time_ms}ms</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">{t('detail.incidents')}</div>
          <div className="text-2xl font-bold text-red-600">{stats.total_incidents}</div>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-4">
        {(['24h', '7d', '30d'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 text-sm rounded-lg ${
              period === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
            }`}
          >
            {t(`detail.period${p}`)}
          </button>
        ))}
      </div>

      {/* Response time chart */}
      {chartData.length > 0 && (
        <div className="p-4 bg-white rounded-xl border border-gray-200 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{t('detail.responseTime')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="ms" />
              <Tooltip />
              <Line type="monotone" dataKey="ms" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent checks */}
      <div className="bg-white rounded-xl border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 p-4 border-b border-gray-100">
          {t('detail.recentChecks')}
        </h3>
        {checks.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">{t('detail.noChecks')}</div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {checks.map((check) => (
                <div key={check.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${check.status === 'up' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm truncate">
                      {check.status === 'up' ? `${check.status_code} - ${check.response_time_ms}ms` : check.error_message}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-3">
                    {new Date(check.checked_at + 'Z').toLocaleString('tr-TR')}
                  </span>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="p-3 border-t border-gray-100 text-center">
                <button
                  onClick={loadMoreChecks}
                  disabled={loadingMore}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {loadingMore ? <Spinner size="sm" /> : t('detail.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
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

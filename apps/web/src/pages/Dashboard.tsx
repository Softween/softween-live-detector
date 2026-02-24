import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { Monitor } from 'shared';
import { api } from '../api/client';
import { CardSkeleton } from '../components/ui/Skeleton';

function StatusDot({ status }: { status: string }) {
  const cls = status === 'up' ? 'dot-up' : status === 'down' ? 'dot-down' : 'dot-unknown';
  return <div className={cls} />;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls = status === 'up' ? 'badge-up' : status === 'down' ? 'badge-down' : 'badge-unknown';
  return <span className={cls}>{t(`status.${status}`, status)}</span>;
}

type SortOption = 'name' | 'status' | 'last_checked';

export default function Dashboard() {
  const { t } = useTranslation();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'up' | 'down'>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('name');

  useEffect(() => {
    loadMonitors();
    const interval = setInterval(loadMonitors, 60000);
    return () => clearInterval(interval);
  }, []);

  async function loadMonitors() {
    try {
      const data = await api.monitors.list();
      setMonitors(data);
    } catch {
      toast.error(t('dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let result = monitors;

    if (filter !== 'all') {
      result = result.filter((m) => m.current_status === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) => m.name.toLowerCase().includes(q) || m.url.toLowerCase().includes(q),
      );
    }

    result = [...result].sort((a, b) => {
      if (sort === 'status') {
        const order = { down: 0, unknown: 1, up: 2 };
        return (order[a.current_status as keyof typeof order] ?? 1) - (order[b.current_status as keyof typeof order] ?? 1);
      }
      if (sort === 'last_checked') {
        return (b.last_checked_at || '').localeCompare(a.last_checked_at || '');
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [monitors, filter, search, sort]);

  const upCount = monitors.filter((m) => m.current_status === 'up').length;
  const downCount = monitors.filter((m) => m.current_status === 'down').length;
  const unknownCount = monitors.length - upCount - downCount;

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-40 bg-zinc-800 rounded animate-pulse" />
          <div className="h-9 w-32 bg-zinc-800 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-3 w-12 bg-zinc-800 rounded mb-2" />
              <div className="h-6 w-8 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">{t('dashboard.title')}</h1>
        <Link to="/monitors/new" className="btn-primary text-xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('dashboard.addMonitor')}
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <div className="text-xs text-zinc-500">{t('dashboard.totalMonitors')}</div>
          <div className="text-xl font-semibold text-zinc-100 mt-1">{monitors.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-zinc-500">{t('dashboard.up')}</div>
          <div className="text-xl font-semibold text-emerald-400 mt-1">{upCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-zinc-500">{t('dashboard.down')}</div>
          <div className="text-xl font-semibold text-red-400 mt-1">{downCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-zinc-500">{t('dashboard.unknown')}</div>
          <div className="text-xl font-semibold text-zinc-400 mt-1">{unknownCount}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder={t('dashboard.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'up', 'down'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                filter === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {f === 'all' ? t('dashboard.filterAll') : f === 'up' ? t('dashboard.filterUp') : t('dashboard.filterDown')}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="input w-auto text-xs">
          <option value="name">{t('dashboard.sortByName')}</option>
          <option value="status">{t('dashboard.sortByStatus')}</option>
          <option value="last_checked">{t('dashboard.sortByLastCheck')}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <p className="text-sm text-zinc-400">
            {monitors.length === 0 ? t('dashboard.noMonitors') : t('dashboard.noFilterMatch')}
          </p>
          {monitors.length === 0 && (
            <>
              <p className="text-xs text-zinc-600 mt-1">{t('dashboard.noMonitorsDesc')}</p>
              <Link to="/monitors/new" className="btn-primary text-xs mt-4 inline-flex">
                {t('dashboard.addFirst')}
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((monitor) => (
            <Link
              key={monitor.id}
              to={`/monitors/${monitor.id}`}
              className="card-hover flex items-center justify-between p-4 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <StatusDot status={monitor.current_status} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-200 truncate group-hover:text-zinc-100">
                    {monitor.name}
                  </div>
                  <div className="text-xs text-zinc-600 truncate">{monitor.url}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <StatusBadge status={monitor.current_status} />
                {monitor.last_checked_at && (
                  <span className="text-[11px] text-zinc-600 hidden sm:inline tabular-nums">
                    {new Date(monitor.last_checked_at + 'Z').toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

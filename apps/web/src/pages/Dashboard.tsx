import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { Monitor } from 'shared';
import { api } from '../api/client';
import { CardSkeleton } from '../components/ui/Skeleton';

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const styles = {
    up: 'bg-green-100 text-green-800',
    down: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-800',
  };
  const key = status as keyof typeof styles;

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[key] || styles.unknown}`}>
      {t(`status.${key}`, status)}
    </span>
  );
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
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-32 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-4 bg-white rounded-xl border border-gray-200 animate-pulse">
              <div className="h-4 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-7 w-10 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">{t('dashboard.up')}</div>
          <div className="text-2xl font-bold text-green-600">{upCount}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">{t('dashboard.down')}</div>
          <div className="text-2xl font-bold text-red-600">{downCount}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-gray-200">
          <div className="text-sm text-gray-500">{t('dashboard.unknown')}</div>
          <div className="text-2xl font-bold text-gray-500">{unknownCount}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t('dashboard.title')}</h1>
        <Link
          to="/monitors/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
        >
          {t('dashboard.addMonitor')}
        </Link>
      </div>

      {/* Search + filter + sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder={t('dashboard.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          {(['all', 'up', 'down'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-lg ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              {f === 'all' ? t('dashboard.filterAll') : f === 'up' ? t('dashboard.filterUp') : t('dashboard.filterDown')}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
        >
          <option value="name">{t('dashboard.sortByName')}</option>
          <option value="status">{t('dashboard.sortByStatus')}</option>
          <option value="last_checked">{t('dashboard.sortByLastCheck')}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">
            {monitors.length === 0
              ? t('dashboard.noMonitors')
              : t('dashboard.noFilterMatch')}
          </p>
          {monitors.length === 0 && (
            <Link
              to="/monitors/new"
              className="inline-block mt-3 text-sm text-blue-600 hover:underline"
            >
              {t('dashboard.addFirst')}
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((monitor) => (
            <Link
              key={monitor.id}
              to={`/monitors/${monitor.id}`}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    monitor.current_status === 'up'
                      ? 'bg-green-500'
                      : monitor.current_status === 'down'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                  }`}
                />
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{monitor.name}</div>
                  <div className="text-xs text-gray-500 truncate">{monitor.url}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <StatusBadge status={monitor.current_status} />
                {monitor.last_checked_at && (
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {new Date(monitor.last_checked_at + 'Z').toLocaleTimeString('tr-TR')}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { Monitor } from 'shared';
import { api } from '../api/client';
import { CardSkeleton } from '../components/ui/Skeleton';
import { useSEO } from '../hooks/useSEO';
import TagBadge from '../components/TagBadge';

function StatusDot({ status }: { status: string }) {
  const cls = status === 'up' ? 'dot-up' : status === 'down' ? 'dot-down' : 'dot-unknown';
  return <div className={cls} />;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const cls = status === 'up' ? 'badge-up' : status === 'down' ? 'badge-down' : 'badge-unknown';
  return <span className={cls}>{t(`status.${status}`, status)}</span>;
}

type SortOption = 'name' | 'status' | 'last_checked' | 'group';
type ViewMode = 'flat' | 'grouped';

export default function Dashboard() {
  const { t } = useTranslation();
  useSEO({ title: 'Dashboard', noindex: true });
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'up' | 'down'>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');

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
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.url.toLowerCase().includes(q) ||
          (m.group_name && m.group_name.toLowerCase().includes(q)) ||
          (m.tags && m.tags.some((t) => t.name.toLowerCase().includes(q))),
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
      if (sort === 'group') {
        return (a.group_name || 'zzz').localeCompare(b.group_name || 'zzz');
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [monitors, filter, search, sort]);

  // Group monitors for grouped view
  const grouped = useMemo(() => {
    if (viewMode !== 'grouped') return null;
    const groups = new Map<string | null, { name: string; color: string; monitors: Monitor[] }>();

    for (const m of filtered) {
      const key = m.group_id || null;
      if (!groups.has(key)) {
        groups.set(key, {
          name: m.group_name || 'Grupsuz',
          color: m.group_color || '#71717a',
          monitors: [],
        });
      }
      groups.get(key)!.monitors.push(m);
    }

    // Sort: named groups first, then ungrouped
    const entries = Array.from(groups.entries());
    entries.sort(([a], [b]) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return 0;
    });

    return entries;
  }, [filtered, viewMode]);

  const upCount = monitors.filter((m) => m.current_status === 'up').length;
  const downCount = monitors.filter((m) => m.current_status === 'down').length;
  const unknownCount = monitors.length - upCount - downCount;

  function renderMonitorRow(monitor: Monitor) {
    return (
      <Link
        key={monitor.id}
        to={`/monitors/${monitor.id}`}
        className="card-hover flex items-center justify-between p-4 group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <StatusDot status={monitor.current_status} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-200 truncate group-hover:text-zinc-100 transition-colors">
                {monitor.name}
              </span>
              {monitor.tags && monitor.tags.length > 0 && (
                <div className="hidden sm:flex items-center gap-1">
                  {monitor.tags.slice(0, 3).map((tag) => (
                    <TagBadge key={tag.id} tag={tag} />
                  ))}
                  {monitor.tags.length > 3 && (
                    <span className="text-[10px] text-zinc-600">+{monitor.tags.length - 3}</span>
                  )}
                </div>
              )}
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
          <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </Link>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div className="h-7 w-40 bg-zinc-800/60 rounded animate-pulse" />
          <div className="h-9 w-32 bg-zinc-800/60 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-3 w-12 bg-zinc-800/60 rounded mb-2" />
              <div className="h-6 w-8 bg-zinc-800/60 rounded" />
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100">{t('dashboard.title')}</h1>
        <div className="flex items-center gap-2">
          <Link to="/monitors/bulk" className="btn-secondary text-xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Toplu Ekle
          </Link>
          <Link to="/monitors/new" className="btn-primary text-xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('dashboard.addMonitor')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="card p-4">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{t('dashboard.totalMonitors')}</div>
          <div className="text-2xl font-bold text-zinc-100 mt-1.5 tabular-nums">{monitors.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{t('dashboard.up')}</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1.5 tabular-nums">{upCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{t('dashboard.down')}</div>
          <div className="text-2xl font-bold text-red-400 mt-1.5 tabular-nums">{downCount}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{t('dashboard.unknown')}</div>
          <div className="text-2xl font-bold text-zinc-400 mt-1.5 tabular-nums">{unknownCount}</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder={t('dashboard.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
          {(['all', 'up', 'down'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                filter === f
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f === 'all' ? t('dashboard.filterAll') : f === 'up' ? t('dashboard.filterUp') : t('dashboard.filterDown')}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'grouped' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            title="Gruplu görünüm"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('flat')}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'flat' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            title="Düz liste"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          </button>
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="input w-auto text-xs">
          <option value="name">{t('dashboard.sortByName')}</option>
          <option value="status">{t('dashboard.sortByStatus')}</option>
          <option value="last_checked">{t('dashboard.sortByLastCheck')}</option>
          <option value="group">Gruba Göre</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-20">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <p className="text-sm text-zinc-400">
            {monitors.length === 0 ? t('dashboard.noMonitors') : t('dashboard.noFilterMatch')}
          </p>
          {monitors.length === 0 && (
            <>
              <p className="text-xs text-zinc-600 mt-1.5">{t('dashboard.noMonitorsDesc')}</p>
              <div className="flex justify-center gap-3 mt-5">
                <Link to="/monitors/new" className="btn-primary text-xs inline-flex">
                  {t('dashboard.addFirst')}
                </Link>
                <Link to="/monitors/bulk" className="btn-secondary text-xs inline-flex">
                  Toplu Ekle
                </Link>
              </div>
            </>
          )}
        </div>
      ) : viewMode === 'grouped' && grouped ? (
        <div className="space-y-6">
          {grouped.map(([groupId, group]) => (
            <div key={groupId || 'ungrouped'}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{group.name}</span>
                <span className="text-[10px] text-zinc-600">{group.monitors.length}</span>
              </div>
              <div className="space-y-1.5">
                {group.monitors.map(renderMonitorRow)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(renderMonitorRow)}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { HeartbeatMonitor } from 'shared';
import { api } from '../api/client';
import Modal from '../components/ui/Modal';

export default function Heartbeats() {
  const { t } = useTranslation();
  const [heartbeats, setHeartbeats] = useState<HeartbeatMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [interval, setInterval] = useState(300);
  const [grace, setGrace] = useState(60);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadHeartbeats();
  }, []);

  async function loadHeartbeats() {
    try {
      const data = await api.heartbeats.list();
      setHeartbeats(data);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      await api.heartbeats.create({
        name,
        expected_interval_seconds: interval,
        grace_period_seconds: grace,
      });
      toast.success(t('heartbeats.createSuccess'));
      setShowCreate(false);
      setName('');
      setInterval(300);
      setGrace(60);
      loadHeartbeats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.heartbeats.delete(deleteId);
      toast.success(t('heartbeats.deleteSuccess'));
      setDeleteId(null);
      loadHeartbeats();
    } catch {
      toast.error(t('common.error'));
    }
  }

  const apiBase = import.meta.env.VITE_API_URL || window.location.origin;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100">
          {t('heartbeats.title')}
        </h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('heartbeats.addHeartbeat')}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : heartbeats.length === 0 ? (
        <div className="card text-center py-20">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <p className="text-sm text-zinc-400">{t('heartbeats.noHeartbeats')}</p>
          <p className="text-xs text-zinc-600 mt-1.5">{t('heartbeats.noHeartbeatsDesc')}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {heartbeats.map((hb) => (
            <div key={hb.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={
                    hb.status === 'up'
                      ? 'dot-up'
                      : hb.status === 'down'
                        ? 'dot-down'
                        : 'dot-unknown'
                  }
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-200">{hb.name}</div>
                  <div className="text-xs text-zinc-600 mt-0.5">
                    {t('heartbeats.lastPing')}:{' '}
                    {hb.last_ping_at
                      ? new Date(hb.last_ping_at + 'Z').toLocaleString()
                      : t('heartbeats.neverPinged')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${apiBase}/api/heartbeat/ping/${hb.token}`,
                    );
                    toast.success(t('common.copied'));
                  }}
                  className="btn-ghost text-xs"
                  title={t('heartbeats.endpoint')}
                  aria-label={t('heartbeats.endpoint')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.856-2.07a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.343 8.07"
                    />
                  </svg>
                </button>
                <button onClick={() => setDeleteId(hb.id)} className="btn-danger text-xs">
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)}>
        <div className="p-6 max-w-sm mx-auto">
          <h3 className="text-lg font-bold text-zinc-100 mb-4">
            {t('heartbeats.addHeartbeat')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="label">{t('heartbeats.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('heartbeats.namePlaceholder')}
                className="input"
              />
            </div>
            <div>
              <label className="label">
                {t('heartbeats.expectedInterval')} ({t('heartbeats.seconds')})
              </label>
              <input
                type="number"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                min={60}
                max={86400}
                className="input"
              />
            </div>
            <div>
              <label className="label">
                {t('heartbeats.gracePeriod')} ({t('heartbeats.seconds')})
              </label>
              <input
                type="number"
                value={grace}
                onChange={(e) => setGrace(Number(e.target.value))}
                min={0}
                max={3600}
                className="input"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="btn-primary flex-1"
              >
                {creating ? t('common.saving') : t('common.save')}
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('common.delete')}
        description={t('heartbeats.deleteConfirm')}
        confirmText={t('common.delete')}
        confirmVariant="danger"
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { ApiKey } from 'shared';
import { api } from '../api/client';
import Modal from '../components/ui/Modal';

export default function ApiKeys() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const data = await api.apiKeys.list();
      setKeys(data);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const result = await api.apiKeys.create(name);
      toast.success(t('apiKeys.createSuccess'));
      setShowCreate(false);
      setName('');
      setRevealedKey(result.raw_key);
      loadKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.apiKeys.delete(deleteId);
      toast.success(t('apiKeys.deleteSuccess'));
      setDeleteId(null);
      loadKeys();
    } catch {
      toast.error(t('common.error'));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100">
          {t('apiKeys.title')}
        </h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('apiKeys.addKey')}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="card text-center py-20">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
          <p className="text-sm text-zinc-400">{t('apiKeys.noKeys')}</p>
          <p className="text-xs text-zinc-600 mt-1.5">{t('apiKeys.noKeysDesc')}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {keys.map((key) => (
            <div key={key.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-200">{key.name}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <code className="text-xs text-zinc-500 font-mono">
                      {key.key_prefix}...
                    </code>
                    <span className="text-[11px] text-zinc-600">
                      {t('apiKeys.lastUsed')}:{' '}
                      {key.last_used_at
                        ? new Date(key.last_used_at + 'Z').toLocaleDateString()
                        : t('apiKeys.never')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <span className="text-[11px] text-zinc-600 hidden sm:inline">
                  {new Date(key.created_at + 'Z').toLocaleDateString()}
                </span>
                <button onClick={() => setDeleteId(key.id)} className="btn-danger text-xs">
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
            {t('apiKeys.addKey')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="label">{t('apiKeys.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('apiKeys.namePlaceholder')}
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

      {/* Key Revealed Modal */}
      <Modal open={!!revealedKey} onClose={() => setRevealedKey(null)}>
        <div className="p-6 max-w-sm mx-auto">
          <h3 className="text-lg font-bold text-zinc-100 mb-2">
            {t('apiKeys.keyCreated')}
          </h3>
          <p className="text-sm text-amber-400 mb-4">{t('apiKeys.keyCreatedDesc')}</p>
          <div className="relative">
            <code className="block text-xs text-zinc-200 bg-white/[0.04] border border-white/[0.06] rounded-lg p-3 pr-12 break-all font-mono">
              {revealedKey}
            </code>
            <button
              onClick={() => {
                if (revealedKey) {
                  navigator.clipboard.writeText(revealedKey);
                  toast.success(t('common.copied'));
                }
              }}
              className="absolute top-2 right-2 btn-ghost text-xs"
              aria-label={t('common.copy')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                />
              </svg>
            </button>
          </div>
          <div className="mt-4">
            <button onClick={() => setRevealedKey(null)} className="btn-primary w-full">
              {t('common.close')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t('common.delete')}
        description={t('apiKeys.deleteConfirm')}
        confirmText={t('common.delete')}
        confirmVariant="danger"
      />
    </div>
  );
}

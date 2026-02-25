import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { api } from '../api/client';

const TIMEOUT_OPTIONS = [
  { value: 3000, key: 'timeout3' },
  { value: 5000, key: 'timeout5' },
  { value: 10000, key: 'timeout10' },
  { value: 15000, key: 'timeout15' },
  { value: 30000, key: 'timeout30' },
];

export default function AddMonitor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [timeout, setTimeout] = useState(10000);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const monitor = await api.monitors.create({
        name,
        url,
        method,
        expected_status: expectedStatus,
        timeout_ms: timeout,
      });
      toast.success(t('monitor.createSuccess'));

      // Trigger first ping immediately
      toast.loading(t('monitor.firstPing'), { id: 'first-ping' });
      try {
        const check = await api.monitors.ping(monitor.id);
        toast.dismiss('first-ping');
        if (check.status === 'up') {
          toast.success(t('monitor.pingSuccess', { time: check.response_time_ms }));
        } else {
          toast.error(t('monitor.pingFailed'));
        }
      } catch {
        toast.dismiss('first-ping');
      }

      navigate(`/monitors/${monitor.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('monitor.createError');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold tracking-tight text-zinc-100 mb-8">{t('monitor.createTitle')}</h1>

      {error && (
        <div className="mb-5 p-3 bg-red-500/10 border border-red-500/15 text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">{t('monitor.name')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('monitor.namePlaceholder')}
            required
            className="input"
          />
        </div>
        <div>
          <label className="label">{t('monitor.url')}</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('monitor.urlPlaceholder')}
            required
            className="input"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t('monitor.httpMethod')}</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="input">
              <option value="GET">GET</option>
              <option value="HEAD">HEAD</option>
            </select>
          </div>
          <div>
            <label className="label">{t('monitor.expectedStatus')}</label>
            <input
              type="number"
              value={expectedStatus}
              onChange={(e) => setExpectedStatus(parseInt(e.target.value, 10))}
              min={100}
              max={599}
              className="input"
            />
          </div>
        </div>
        <div>
          <label className="label">{t('monitor.timeout')}</label>
          <select value={timeout} onChange={(e) => setTimeout(parseInt(e.target.value, 10))} className="input">
            {TIMEOUT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(`monitor.${opt.key}`)}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-600 mt-1.5">{t('monitor.timeoutHint')}</p>
        </div>
        <div className="flex gap-3 pt-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('monitor.creating') : t('monitor.createButton')}
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary">
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}

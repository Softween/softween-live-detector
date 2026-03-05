import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import mixpanel from 'mixpanel-browser';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import GroupSelector from '../components/GroupSelector';
import TagSelector from '../components/TagSelector';

const TIMEOUT_OPTIONS = [
  { value: 3000, key: 'timeout3' },
  { value: 5000, key: 'timeout5' },
  { value: 10000, key: 'timeout10' },
  { value: 15000, key: 'timeout15' },
  { value: 30000, key: 'timeout30' },
];

const CHECK_INTERVAL_OPTIONS = [
  { value: 60, key: 'interval60' },
  { value: 120, key: 'interval120' },
  { value: 300, key: 'interval300' },
  { value: 600, key: 'interval600' },
];

export default function AddMonitor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [monitorType, setMonitorType] = useState('http');
  const [port, setPort] = useState('');
  const [method, setMethod] = useState('GET');
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [timeout, setTimeout] = useState(10000);
  const [checkInterval, setCheckInterval] = useState(300);
  const [keyword, setKeyword] = useState('');
  const [customHeaders, setCustomHeaders] = useState('');
  const [checkRegions, setCheckRegions] = useState('auto');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
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
        check_keyword: keyword || undefined,
        monitor_type: monitorType,
        port: monitorType === 'tcp' && port ? parseInt(port, 10) : undefined,
        check_interval_seconds: checkInterval,
        custom_headers: customHeaders || undefined,
        check_regions: checkRegions,
        group_id: groupId,
        tag_ids: tagIds.length > 0 ? tagIds : undefined,
      } as any);
      toast.success(t('monitor.createSuccess'));
      mixpanel.track('Conversion', {
        'Conversion Type': 'monitor_created',
        'Conversion Value': monitorType,
      });

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
        {/* Monitor Type */}
        <div>
          <label className="label">{t('monitor.monitorType')}</label>
          <select value={monitorType} onChange={(e) => setMonitorType(e.target.value)} className="input">
            <option value="http">HTTP</option>
            <option value="tcp">TCP</option>
          </select>
        </div>

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
            type={monitorType === 'http' ? 'url' : 'text'}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={monitorType === 'http' ? t('monitor.urlPlaceholder') : t('monitor.hostPlaceholder')}
            required
            className="input"
          />
        </div>

        {/* Port (TCP only) */}
        {monitorType === 'tcp' && (
          <div>
            <label className="label">{t('monitor.port')}</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="443"
              min={1}
              max={65535}
              required
              className="input"
            />
          </div>
        )}

        {monitorType === 'http' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        )}

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

        {/* Check Interval */}
        <div>
          <label className="label">{t('monitor.checkInterval')}</label>
          <select value={checkInterval} onChange={(e) => setCheckInterval(parseInt(e.target.value, 10))} className="input">
            {CHECK_INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(`monitor.${opt.key}`)}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-600 mt-1.5">{t('monitor.checkIntervalHint')}</p>
        </div>

        {monitorType === 'http' && (
          <div>
            <label className="label">{t('monitor.keyword')}</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t('monitor.keywordPlaceholder')}
              className="input"
            />
            <p className="text-xs text-zinc-600 mt-1.5">{t('monitor.keywordHint')}</p>
          </div>
        )}

        {/* Custom Headers (HTTP only) */}
        {monitorType === 'http' && (
          <div>
            <label className="label">{t('monitor.customHeaders')}</label>
            <textarea
              value={customHeaders}
              onChange={(e) => setCustomHeaders(e.target.value)}
              placeholder={'{"Authorization": "Bearer token"}'}
              rows={3}
              className="input resize-none"
            />
            <p className="text-xs text-zinc-600 mt-1.5">{t('monitor.customHeadersHint')}</p>
          </div>
        )}

        {/* Check Regions */}
        <div>
          <label className="label">{t('monitor.checkRegions')}</label>
          <select value={checkRegions} onChange={(e) => setCheckRegions(e.target.value)} className="input">
            <option value="auto">{t('monitor.regionAuto')}</option>
            <option value="us">{t('monitor.regionUs')}</option>
            <option value="eu">{t('monitor.regionEu')}</option>
            <option value="asia">{t('monitor.regionAsia')}</option>
          </select>
        </div>

        {/* Group & Tags */}
        <div className="border-t border-white/[0.06] pt-5 space-y-5">
          <GroupSelector value={groupId} onChange={setGroupId} />
          <TagSelector value={tagIds} onChange={setTagIds} />
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

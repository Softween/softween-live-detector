import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { Monitor } from 'shared';
import { api } from '../api/client';
import Spinner from '../components/ui/Spinner';
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

export default function EditMonitor() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
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
  const [maintenanceStart, setMaintenanceStart] = useState('');
  const [maintenanceEnd, setMaintenanceEnd] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.monitors.get(id).then((data) => {
      setMonitor(data);
      setName(data.name);
      setUrl(data.url);
      setMethod(data.method);
      setExpectedStatus(data.expected_status);
      setTimeout(data.timeout_ms);
      setKeyword(data.check_keyword || '');
      setMaintenanceStart(data.maintenance_start || '');
      setMaintenanceEnd(data.maintenance_end || '');
      setMonitorType((data as any).monitor_type || 'http');
      setPort((data as any).port ? String((data as any).port) : '');
      setCheckInterval((data as any).check_interval_seconds || 300);
      setCustomHeaders((data as any).custom_headers || '');
      setCheckRegions((data as any).check_regions || 'auto');
      setGroupId(data.group_id || null);
      setTagIds(data.tags?.map((t) => t.id) || []);
    }).catch(() => {
      toast.error(t('monitor.notFound'));
      navigate('/dashboard');
    });
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError('');
    setLoading(true);

    try {
      await api.monitors.update(id, {
        name, url, method,
        expected_status: expectedStatus,
        timeout_ms: timeout,
        check_keyword: keyword || null,
        maintenance_start: maintenanceStart || null,
        maintenance_end: maintenanceEnd || null,
        monitor_type: monitorType,
        port: monitorType === 'tcp' && port ? parseInt(port, 10) : undefined,
        check_interval_seconds: checkInterval,
        custom_headers: customHeaders || undefined,
        check_regions: checkRegions,
        group_id: groupId,
      } as any);
      // Update tags separately
      if (id) {
        await api.tags.setMonitorTags(id, tagIds).catch(() => {});
      }
      toast.success(t('monitor.updateSuccess'));
      navigate(`/monitors/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('monitor.updateError');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!monitor) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold tracking-tight text-zinc-100 mb-8">{t('monitor.editTitle')}</h1>

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
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input" />
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

        {/* Maintenance Window */}
        <div className="border-t border-white/[0.06] pt-5">
          <label className="label mb-3">{t('monitor.maintenanceWindow')}</label>
          <p className="text-xs text-zinc-600 mb-3">{t('monitor.maintenanceDesc')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-[10px]">{t('monitor.maintenanceStart')}</label>
              <input
                type="datetime-local"
                value={maintenanceStart}
                onChange={(e) => setMaintenanceStart(e.target.value)}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="label text-[10px]">{t('monitor.maintenanceEnd')}</label>
              <input
                type="datetime-local"
                value={maintenanceEnd}
                onChange={(e) => setMaintenanceEnd(e.target.value)}
                className="input text-xs"
              />
            </div>
          </div>
          {maintenanceStart && maintenanceEnd && (
            <button
              type="button"
              onClick={() => { setMaintenanceStart(''); setMaintenanceEnd(''); }}
              className="text-xs text-red-400 hover:text-red-300 mt-2"
            >
              {t('monitor.clearMaintenance')}
            </button>
          )}
        </div>
        <div className="flex gap-3 pt-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" onClick={() => navigate(`/monitors/${id}`)} className="btn-secondary">
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}

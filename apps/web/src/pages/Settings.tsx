import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { Monitor, StatusPage } from 'shared';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';

export default function Settings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [cooldown, setCooldown] = useState('15');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  // Status page state
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [statusPage, setStatusPage] = useState<StatusPage | null>(null);
  const [spSlug, setSpSlug] = useState('');
  const [spTitle, setSpTitle] = useState('Status');
  const [spDescription, setSpDescription] = useState('');
  const [spPublic, setSpPublic] = useState(true);
  const [spMonitorIds, setSpMonitorIds] = useState<string[]>([]);
  const [spLoading, setSpLoading] = useState(false);

  useEffect(() => {
    api.auth.getNotifications().then((settings) => {
      setEmailEnabled(settings.email_enabled);
      setCooldown(String(settings.cooldown_minutes));
      setWebhookUrl(settings.webhook_url || '');
      setWebhookEnabled(settings.webhook_enabled);
    }).catch(() => {});

    api.monitors.list().then(setMonitors).catch(() => {});

    api.statusPage.getMine().then(({ page, monitor_ids }) => {
      if (page) {
        setStatusPage(page);
        setSpSlug(page.slug);
        setSpTitle(page.title);
        setSpDescription(page.description || '');
        setSpPublic(page.is_public === 1);
        setSpMonitorIds(monitor_ids);
      }
    }).catch(() => {});
  }, []);

  async function handleSave() {
    setLoading(true);
    try {
      await api.auth.updateNotifications({
        email_enabled: emailEnabled,
        cooldown_minutes: cooldown,
        webhook_url: webhookUrl || '',
        webhook_enabled: webhookEnabled,
      });
      toast.success(t('settings.saveSuccess'));
    } catch {
      toast.error(t('settings.saveError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusPageSave() {
    if (!spSlug.trim()) return;
    setSpLoading(true);
    try {
      const result = await api.statusPage.updateMine({
        slug: spSlug.toLowerCase(),
        title: spTitle,
        description: spDescription || undefined,
        is_public: spPublic,
        monitor_ids: spMonitorIds,
      });
      setStatusPage(result.page);
      toast.success(t('settings.statusPageSaved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.saveError'));
    } finally {
      setSpLoading(false);
    }
  }

  function toggleMonitorId(id: string) {
    setSpMonitorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  const statusPageUrl = statusPage
    ? `${window.location.origin}/status/${statusPage.slug}`
    : null;

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold tracking-tight text-zinc-100 mb-8">{t('settings.title')}</h1>

      {/* Account Info */}
      <div className="card p-5 mb-4">
        <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-4">{t('settings.accountInfo')}</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">{t('auth.name')}</span>
            <span className="text-zinc-200 font-medium">{user?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">{t('auth.email')}</span>
            <span className="text-zinc-200 font-medium">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="card p-5 mb-4">
        <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-5">{t('settings.notifications')}</h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-200">{t('settings.emailNotifications')}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{t('settings.emailNotificationsDesc')}</div>
            </div>
            <button
              onClick={() => setEmailEnabled(!emailEnabled)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-150 ${emailEnabled ? 'bg-violet-600' : 'bg-zinc-700'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-150 ${emailEnabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          <div>
            <label className="label">{t('settings.cooldown')}</label>
            <select value={cooldown} onChange={(e) => setCooldown(e.target.value)} className="input">
              <option value="5">{t('settings.cooldown5')}</option>
              <option value="15">{t('settings.cooldown15')}</option>
              <option value="30">{t('settings.cooldown30')}</option>
              <option value="60">{t('settings.cooldown60')}</option>
            </select>
            <p className="text-xs text-zinc-600 mt-1.5">{t('settings.cooldownDesc')}</p>
          </div>

          {/* Webhook */}
          <div className="border-t border-white/[0.06] pt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-medium text-zinc-200">{t('settings.webhookNotifications')}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{t('settings.webhookDesc')}</div>
              </div>
              <button
                onClick={() => setWebhookEnabled(!webhookEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-150 ${webhookEnabled ? 'bg-violet-600' : 'bg-zinc-700'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-150 ${webhookEnabled ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
            {webhookEnabled && (
              <div>
                <label className="label">{t('settings.webhookUrl')}</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="input"
                />
                <p className="text-xs text-zinc-600 mt-1.5">{t('settings.webhookHint')}</p>
              </div>
            )}
          </div>

          <button onClick={handleSave} disabled={loading} className="btn-primary">
            {loading ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>

      {/* Status Page Settings */}
      <div className="card p-5">
        <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-5">{t('settings.statusPageTitle')}</h2>

        <div className="space-y-5">
          <div>
            <label className="label">{t('settings.statusPageSlug')}</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600 flex-shrink-0">/status/</span>
              <input
                type="text"
                value={spSlug}
                onChange={(e) => setSpSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="my-company"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">{t('settings.statusPageName')}</label>
            <input
              type="text"
              value={spTitle}
              onChange={(e) => setSpTitle(e.target.value)}
              placeholder="My Company Status"
              className="input"
            />
          </div>

          <div>
            <label className="label">{t('settings.statusPageDescription')}</label>
            <input
              type="text"
              value={spDescription}
              onChange={(e) => setSpDescription(e.target.value)}
              placeholder={t('settings.statusPageDescPlaceholder')}
              className="input"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-zinc-200">{t('settings.statusPagePublic')}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{t('settings.statusPagePublicDesc')}</div>
            </div>
            <button
              onClick={() => setSpPublic(!spPublic)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-150 ${spPublic ? 'bg-violet-600' : 'bg-zinc-700'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-150 ${spPublic ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Monitor selection */}
          <div>
            <label className="label">{t('settings.statusPageMonitors')}</label>
            <div className="space-y-1.5 mt-2">
              {monitors.map((m) => (
                <label key={m.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={spMonitorIds.includes(m.id)}
                    onChange={() => toggleMonitorId(m.id)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-violet-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">{m.name}</span>
                  <span className={`text-[10px] ml-auto ${m.current_status === 'up' ? 'text-emerald-500' : m.current_status === 'down' ? 'text-red-500' : 'text-zinc-600'}`}>
                    {m.current_status}
                  </span>
                </label>
              ))}
              {monitors.length === 0 && (
                <p className="text-xs text-zinc-600">{t('settings.noMonitorsToAdd')}</p>
              )}
            </div>
          </div>

          <button onClick={handleStatusPageSave} disabled={spLoading || !spSlug.trim()} className="btn-primary">
            {spLoading ? t('common.saving') : t('settings.statusPageSave')}
          </button>

          {statusPageUrl && (
            <div className="border-t border-white/[0.06] pt-4">
              <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">{t('settings.statusPageUrl')}</div>
              <div className="flex items-center gap-2">
                <code className="text-xs text-violet-400 bg-white/[0.04] px-2.5 py-1.5 rounded-md border border-white/[0.06] flex-1 truncate">
                  {statusPageUrl}
                </code>
                <button
                  onClick={() => { navigator.clipboard.writeText(statusPageUrl); toast.success(t('common.copied')); }}
                  className="btn-secondary text-xs flex-shrink-0"
                >
                  {t('common.copy')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Monitor, StatusPage } from 'shared';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import Modal from '../components/ui/Modal';

export default function Settings() {
  const { t } = useTranslation();
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [cooldown, setCooldown] = useState('15');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [slowThreshold, setSlowThreshold] = useState('');
  const [slowEnabled, setSlowEnabled] = useState(false);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Account delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Email verification
  const [resendLoading, setResendLoading] = useState(false);

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
      setSlowThreshold(settings.slow_threshold_ms ? String(settings.slow_threshold_ms) : '');
      setSlowEnabled(settings.slow_alert_enabled);
      setTelegramToken((settings as any).telegram_bot_token || '');
      setTelegramChatId((settings as any).telegram_chat_id || '');
      setTelegramEnabled((settings as any).telegram_enabled ?? false);
      setWeeklyReportEnabled((settings as any).weekly_report_enabled ?? false);
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
        slow_threshold_ms: slowEnabled && slowThreshold ? parseInt(slowThreshold, 10) : null,
        slow_alert_enabled: slowEnabled,
        telegram_bot_token: telegramToken || '',
        telegram_chat_id: telegramChatId || '',
        telegram_enabled: telegramEnabled,
        weekly_report_enabled: weeklyReportEnabled,
      } as any);
      toast.success(t('settings.saveSuccess'));
    } catch {
      toast.error(t('settings.saveError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleWebhookTest() {
    setWebhookTesting(true);
    try {
      await (api as any).webhooks.test();
      toast.success(t('settings.webhookTestSuccess'));
    } catch {
      toast.error(t('settings.webhookTestFailed'));
    } finally {
      setWebhookTesting(false);
    }
  }

  async function handlePasswordChange() {
    if (newPassword !== newPasswordConfirm) {
      toast.error(t('auth.passwordMismatch'));
      return;
    }
    setPwLoading(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      toast.success(t('settings.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.saveError'));
    } finally {
      setPwLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      await api.auth.deleteAccount(deletePassword);
      toast.success(t('settings.accountDeleted'));
      await logout();
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('settings.saveError'));
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      setDeletePassword('');
    }
  }

  async function handleResendVerification() {
    setResendLoading(true);
    try {
      await api.auth.resendVerification();
      toast.success(t('settings.verificationSent'));
    } catch {
      toast.error(t('settings.saveError'));
    } finally {
      setResendLoading(false);
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

      {/* Email Verification Banner */}
      {user && user.email_verified === 0 && (
        <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/15 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-amber-400 font-medium">{t('settings.emailNotVerified')}</p>
            <p className="text-xs text-amber-400/60 mt-1">{t('settings.emailNotVerifiedDesc')}</p>
            <button
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium mt-2 underline"
            >
              {resendLoading ? t('common.loading') : t('settings.resendVerification')}
            </button>
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-2">
              <span className="text-zinc-200 font-medium">{user?.email}</span>
              {user?.email_verified === 1 && (
                <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">{t('settings.verified')}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-5 mb-4">
        <h2 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-5">{t('settings.changePassword')}</h2>
        <div className="space-y-4">
          <div>
            <label className="label">{t('settings.currentPassword')}</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">{t('auth.newPassword')}</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} className="input" />
            <p className="text-xs text-zinc-600 mt-1">{t('auth.passwordHint')}</p>
          </div>
          <div>
            <label className="label">{t('auth.passwordConfirm')}</label>
            <input type="password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} minLength={8} className="input" />
          </div>
          <button
            onClick={handlePasswordChange}
            disabled={pwLoading || !currentPassword || !newPassword || !newPasswordConfirm}
            className="btn-primary"
          >
            {pwLoading ? t('common.saving') : t('settings.updatePassword')}
          </button>
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

          {/* Slow Response Alert */}
          <div className="border-t border-white/[0.06] pt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-medium text-zinc-200">{t('settings.slowResponseAlert')}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{t('settings.slowResponseAlertDesc')}</div>
              </div>
              <button
                onClick={() => setSlowEnabled(!slowEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-150 ${slowEnabled ? 'bg-violet-600' : 'bg-zinc-700'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-150 ${slowEnabled ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
            {slowEnabled && (
              <div>
                <label className="label">{t('settings.slowThreshold')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={slowThreshold}
                    onChange={(e) => setSlowThreshold(e.target.value)}
                    placeholder="3000"
                    min={100}
                    max={60000}
                    className="input"
                  />
                  <span className="text-xs text-zinc-500 flex-shrink-0">ms</span>
                </div>
                <p className="text-xs text-zinc-600 mt-1.5">{t('settings.slowThresholdDesc')}</p>
              </div>
            )}
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
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="input"
                  />
                  <button
                    type="button"
                    onClick={handleWebhookTest}
                    disabled={webhookTesting || !webhookUrl}
                    className="btn-secondary text-xs flex-shrink-0"
                  >
                    {webhookTesting ? t('common.loading') : t('settings.webhookTest')}
                  </button>
                </div>
                <p className="text-xs text-zinc-600 mt-1.5">{t('settings.webhookHint')}</p>
              </div>
            )}
          </div>

          {/* Telegram */}
          <div className="border-t border-white/[0.06] pt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-medium text-zinc-200">{t('settings.telegramTitle')}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{t('settings.telegramDesc')}</div>
              </div>
              <button
                onClick={() => setTelegramEnabled(!telegramEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-150 ${telegramEnabled ? 'bg-violet-600' : 'bg-zinc-700'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-150 ${telegramEnabled ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
            {telegramEnabled && (
              <div className="space-y-4">
                <div>
                  <label className="label">{t('settings.telegramToken')}</label>
                  <input
                    type="text"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="123456:ABC-DEF..."
                    className="input"
                  />
                  <p className="text-xs text-zinc-600 mt-1.5">{t('settings.telegramTokenHint')}</p>
                </div>
                <div>
                  <label className="label">{t('settings.telegramChatId')}</label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="-1001234567890"
                    className="input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Weekly Report */}
          <div className="border-t border-white/[0.06] pt-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-zinc-200">{t('settings.weeklyReport')}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{t('settings.weeklyReportDesc')}</div>
              </div>
              <button
                onClick={() => setWeeklyReportEnabled(!weeklyReportEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors duration-150 ${weeklyReportEnabled ? 'bg-violet-600' : 'bg-zinc-700'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-150 ${weeklyReportEnabled ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <button onClick={handleSave} disabled={loading} className="btn-primary">
            {loading ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>

      {/* Status Page Settings */}
      <div className="card p-5 mb-4">
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

      {/* Danger Zone */}
      <div className="card p-5 border-red-500/20">
        <h2 className="text-[11px] font-medium text-red-400 uppercase tracking-wider mb-4">{t('settings.dangerZone')}</h2>
        <p className="text-xs text-zinc-500 mb-4">{t('settings.deleteAccountDesc')}</p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors"
        >
          {t('settings.deleteAccount')}
        </button>
      </div>

      {/* Delete Account Modal */}
      <Modal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeletePassword(''); }}>
        <div className="p-6 max-w-sm mx-auto">
          <h3 className="text-lg font-bold text-zinc-100 mb-2">{t('settings.deleteAccount')}</h3>
          <p className="text-sm text-zinc-400 mb-5">{t('settings.deleteAccountConfirm')}</p>
          <div className="mb-4">
            <label className="label">{t('auth.password')}</label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder={t('settings.enterPasswordToConfirm')}
              className="input"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }}
              className="btn-secondary flex-1"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteLoading || !deletePassword}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {deleteLoading ? t('common.deleting') : t('common.delete')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

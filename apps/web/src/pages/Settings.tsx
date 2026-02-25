import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';

export default function Settings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [cooldown, setCooldown] = useState('15');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.auth.getNotifications().then((settings) => {
      setEmailEnabled(settings.email_enabled);
      setCooldown(String(settings.cooldown_minutes));
    }).catch(() => {});
  }, []);

  async function handleSave() {
    setLoading(true);
    try {
      await api.auth.updateNotifications({ email_enabled: emailEnabled, cooldown_minutes: cooldown });
      toast.success(t('settings.saveSuccess'));
    } catch {
      toast.error(t('settings.saveError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold tracking-tight text-zinc-100 mb-8">{t('settings.title')}</h1>

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

      <div className="card p-5">
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

          <button onClick={handleSave} disabled={loading} className="btn-primary">
            {loading ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

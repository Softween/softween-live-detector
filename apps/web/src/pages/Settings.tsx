import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';

export default function Settings() {
  const { user } = useAuth();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [cooldown, setCooldown] = useState('15');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.auth
      .getNotifications()
      .then((settings) => {
        setEmailEnabled(settings.email_enabled);
        setCooldown(String(settings.cooldown_minutes));
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    setError('');
    try {
      await api.auth.updateNotifications({ email_enabled: emailEnabled, cooldown_minutes: cooldown });
      setSaved(true);
    } catch {
      setError('Ayarlar kaydedilemedi');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold mb-6">Ayarlar</h1>

      {/* Account info */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Hesap Bilgileri</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">İsim</span>
            <span>{user?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span>{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Notification settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Bildirim Ayarları</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Email Bildirimleri</div>
              <div className="text-xs text-gray-500">Site down/up olduğunda email al</div>
            </div>
            <button
              onClick={() => setEmailEnabled(!emailEnabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                emailEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  emailEnabled ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bildirim Bekleme Süresi</label>
            <select
              value={cooldown}
              onChange={(e) => setCooldown(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="5">5 dakika</option>
              <option value="15">15 dakika</option>
              <option value="30">30 dakika</option>
              <option value="60">60 dakika</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Aynı monitör için tekrar bildirim göndermeden önce beklenecek süre
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>

          {saved && <p className="text-sm text-green-600">Ayarlar kaydedildi.</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

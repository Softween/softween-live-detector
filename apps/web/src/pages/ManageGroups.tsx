import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { MonitorGroup } from 'shared';
import { GROUP_COLORS } from 'shared';
import { api } from '../api/client';
import Spinner from '../components/ui/Spinner';
import { useSEO } from '../hooks/useSEO';

export default function ManageGroups() {
  const { t } = useTranslation();
  useSEO({ title: 'Gruplar', noindex: true });
  const [groups, setGroups] = useState<MonitorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(GROUP_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      const data = await api.groups.list();
      setGroups(data);
    } catch {
      toast.error('Gruplar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(group: MonitorGroup) {
    setEditingId(group.id);
    setName(group.name);
    setDescription(group.description || '');
    setColor(group.color);
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setDescription('');
    setColor(GROUP_COLORS[0]);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingId) {
        await api.groups.update(editingId, { name, description: description || null, color });
        toast.success('Grup güncellendi');
      } else {
        await api.groups.create({ name, description: description || undefined, color });
        toast.success('Grup oluşturuldu');
      }
      resetForm();
      loadGroups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Hata oluştu';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu grubu silmek istediğinize emin misiniz? Monitörler grupsuz kalacak.')) return;
    try {
      await api.groups.delete(id);
      toast.success('Grup silindi');
      loadGroups();
    } catch {
      toast.error('Grup silinemedi');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100">Gruplar</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-xs">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Yeni Grup
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 mb-6 space-y-4">
          <div>
            <label className="label">Grup Adı</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="API Servisleri"
              required
              maxLength={100}
              className="input"
            />
          </div>
          <div>
            <label className="label">Açıklama (opsiyonel)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Backend API endpointleri"
              maxLength={500}
              className="input"
            />
          </div>
          <div>
            <label className="label">Renk</label>
            <div className="flex gap-2">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-lg transition-all"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? '2px solid white' : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-primary text-xs">
              {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Oluştur'}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary text-xs">
              İptal
            </button>
          </div>
        </form>
      )}

      {groups.length === 0 && !showForm ? (
        <div className="card text-center py-16">
          <p className="text-sm text-zinc-400">Henüz grup oluşturmadınız</p>
          <p className="text-xs text-zinc-600 mt-1.5">Monitörlerinizi organize etmek için gruplar oluşturun</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {groups.map((group) => (
            <div key={group.id} className="card flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-200 truncate">{group.name}</div>
                  {group.description && (
                    <div className="text-xs text-zinc-600 truncate">{group.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <button
                  onClick={() => startEdit(group)}
                  className="p-1.5 rounded-md hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(group.id)}
                  className="p-1.5 rounded-md hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import GroupSelector from '../components/GroupSelector';
import TagSelector from '../components/TagSelector';
import { useSEO } from '../hooks/useSEO';

type Tab = 'urls' | 'sitemap' | 'pathbuilder';

export default function BulkImport() {
  useSEO({ title: 'Toplu Ekle', noindex: true });
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('urls');
  const [loading, setLoading] = useState(false);
  const [capacity, setCapacity] = useState({ remaining: 25, max: 25 });
  const [groupId, setGroupId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [checkInterval, setCheckInterval] = useState(300);
  const [timeoutMs, setTimeoutMs] = useState(10000);

  // URL paste tab
  const [urlText, setUrlText] = useState('');

  // Sitemap tab
  const [sitemapDomain, setSitemapDomain] = useState('');
  const [sitemapUrls, setSitemapUrls] = useState<string[]>([]);
  const [selectedSitemapUrls, setSelectedSitemapUrls] = useState<Set<string>>(new Set());
  const [sitemapLoading, setSitemapLoading] = useState(false);

  // Path builder tab
  const [baseDomain, setBaseDomain] = useState('');
  const [paths, setPaths] = useState<string[]>(['/api/health']);

  useEffect(() => {
    api.bulk.capacity().then(setCapacity).catch(() => {});
  }, []);

  const parsedUrls = urlText
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u.length > 0);

  async function handleUrlImport() {
    if (parsedUrls.length === 0) return;
    setLoading(true);
    try {
      const result = await api.bulk.importUrls({
        urls: parsedUrls,
        group_id: groupId,
        tag_ids: tagIds.length > 0 ? tagIds : undefined,
        check_interval_seconds: checkInterval,
        timeout_ms: timeoutMs,
      });
      toast.success(`${result.created} monitör oluşturuldu`);
      if (result.failed.length > 0) {
        toast.error(`${result.failed.length} URL başarısız`);
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'İçe aktarma başarısız');
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchSitemap() {
    if (!sitemapDomain) return;
    setSitemapLoading(true);
    try {
      const result = await api.bulk.fetchSitemap(sitemapDomain);
      setSitemapUrls(result.urls);
      setSelectedSitemapUrls(new Set(result.urls.slice(0, capacity.remaining)));
      toast.success(`${result.total} URL bulundu`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Sitemap alınamadı');
    } finally {
      setSitemapLoading(false);
    }
  }

  async function handleSitemapImport() {
    const urls = Array.from(selectedSitemapUrls);
    if (urls.length === 0) return;
    setLoading(true);
    try {
      const result = await api.bulk.importUrls({
        urls,
        group_id: groupId,
        tag_ids: tagIds.length > 0 ? tagIds : undefined,
        check_interval_seconds: checkInterval,
        timeout_ms: timeoutMs,
      });
      toast.success(`${result.created} monitör oluşturuldu`);
      navigate('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'İçe aktarma başarısız');
    } finally {
      setLoading(false);
    }
  }

  async function handlePathBuilderImport() {
    const validPaths = paths.filter((p) => p.trim().length > 0);
    if (!baseDomain || validPaths.length === 0) return;
    setLoading(true);
    try {
      const result = await api.bulk.importPathBuilder({
        base_url: baseDomain,
        paths: validPaths,
        group_id: groupId,
        tag_ids: tagIds.length > 0 ? tagIds : undefined,
        check_interval_seconds: checkInterval,
        timeout_ms: timeoutMs,
      });
      toast.success(`${result.created} monitör oluşturuldu`);
      navigate('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'İçe aktarma başarısız');
    } finally {
      setLoading(false);
    }
  }

  function toggleSitemapUrl(url: string) {
    const next = new Set(selectedSitemapUrls);
    if (next.has(url)) {
      next.delete(url);
    } else if (next.size < capacity.remaining) {
      next.add(url);
    }
    setSelectedSitemapUrls(next);
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold tracking-tight text-zinc-100">Toplu Monitör Ekle</h1>
        <div className="text-xs text-zinc-500">
          <span className="text-zinc-300 font-medium">{capacity.max - capacity.remaining}</span>/{capacity.max} kullanımda
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5 mb-6">
        {([
          { key: 'urls', label: 'URL Yapıştır' },
          { key: 'sitemap', label: 'Sitemap Tara' },
          { key: 'pathbuilder', label: 'Endpoint Builder' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all duration-150 ${
              tab === t.key
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* URL Paste Tab */}
      {tab === 'urls' && (
        <div className="space-y-5">
          <div>
            <label className="label">URL Listesi (her satıra bir URL)</label>
            <textarea
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              placeholder={'https://api.example.com/health\nhttps://www.example.com\nhttps://cdn.example.com'}
              rows={8}
              className="input resize-none font-mono text-xs"
            />
            <p className="text-xs text-zinc-600 mt-1.5">
              {parsedUrls.length} URL algılandı — max {capacity.remaining} eklenebilir
            </p>
          </div>
        </div>
      )}

      {/* Sitemap Tab */}
      {tab === 'sitemap' && (
        <div className="space-y-5">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Domain</label>
              <input
                type="url"
                value={sitemapDomain}
                onChange={(e) => setSitemapDomain(e.target.value)}
                placeholder="https://example.com"
                className="input"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFetchSitemap}
                disabled={sitemapLoading || !sitemapDomain}
                className="btn-primary text-xs"
              >
                {sitemapLoading ? 'Taranıyor...' : 'Sitemap Tara'}
              </button>
            </div>
          </div>
          {sitemapUrls.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-400">{sitemapUrls.length} URL bulundu — {selectedSitemapUrls.size} seçili</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSitemapUrls(new Set(sitemapUrls.slice(0, capacity.remaining)))}
                    className="text-[10px] text-violet-400 hover:text-violet-300"
                  >
                    Tümünü seç
                  </button>
                  <button
                    onClick={() => setSelectedSitemapUrls(new Set())}
                    className="text-[10px] text-zinc-500 hover:text-zinc-400"
                  >
                    Temizle
                  </button>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-white/[0.06] bg-white/[0.02]">
                {sitemapUrls.map((url) => (
                  <label key={url} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.03] cursor-pointer border-b border-white/[0.04] last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedSitemapUrls.has(url)}
                      onChange={() => toggleSitemapUrl(url)}
                      className="rounded border-zinc-700 bg-zinc-800 text-violet-500 focus:ring-violet-500/30"
                    />
                    <span className="text-xs text-zinc-400 truncate">{url}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Path Builder Tab */}
      {tab === 'pathbuilder' && (
        <div className="space-y-5">
          <div>
            <label className="label">Base URL</label>
            <input
              type="url"
              value={baseDomain}
              onChange={(e) => setBaseDomain(e.target.value)}
              placeholder="https://api.example.com"
              className="input"
            />
          </div>
          <div>
            <label className="label">Endpoint Path'leri</label>
            <div className="space-y-2">
              {paths.map((path, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => {
                      const next = [...paths];
                      next[i] = e.target.value;
                      setPaths(next);
                    }}
                    placeholder="/api/health"
                    className="input flex-1 font-mono text-xs"
                  />
                  {paths.length > 1 && (
                    <button
                      onClick={() => setPaths(paths.filter((_, j) => j !== i))}
                      className="p-2 text-zinc-500 hover:text-red-400"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {paths.length < 25 && (
              <button
                onClick={() => setPaths([...paths, ''])}
                className="text-xs text-violet-400 hover:text-violet-300 mt-2"
              >
                + Path Ekle
              </button>
            )}
          </div>
          {baseDomain && (
            <div className="text-xs text-zinc-600">
              <p className="font-medium text-zinc-500 mb-1">Önizleme:</p>
              {paths.filter((p) => p.trim()).slice(0, 3).map((p, i) => (
                <p key={i} className="truncate">{baseDomain.replace(/\/$/, '')}{p.startsWith('/') ? p : `/${p}`}</p>
              ))}
              {paths.filter((p) => p.trim()).length > 3 && <p>... +{paths.filter((p) => p.trim()).length - 3} daha</p>}
            </div>
          )}
        </div>
      )}

      {/* Shared settings */}
      <div className="border-t border-white/[0.06] mt-6 pt-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Kontrol Aralığı</label>
            <select value={checkInterval} onChange={(e) => setCheckInterval(Number(e.target.value))} className="input">
              <option value={60}>1 dakika</option>
              <option value={120}>2 dakika</option>
              <option value={300}>5 dakika</option>
              <option value={600}>10 dakika</option>
            </select>
          </div>
          <div>
            <label className="label">Timeout</label>
            <select value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))} className="input">
              <option value={3000}>3 saniye</option>
              <option value={5000}>5 saniye</option>
              <option value={10000}>10 saniye</option>
              <option value={30000}>30 saniye</option>
            </select>
          </div>
        </div>

        <GroupSelector value={groupId} onChange={setGroupId} />
        <TagSelector value={tagIds} onChange={setTagIds} />
      </div>

      <div className="flex gap-3 pt-6">
        <button
          onClick={
            tab === 'urls'
              ? handleUrlImport
              : tab === 'sitemap'
                ? handleSitemapImport
                : handlePathBuilderImport
          }
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'İçe aktarılıyor...' : 'Monitörleri Oluştur'}
        </button>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary">
          İptal
        </button>
      </div>
    </div>
  );
}

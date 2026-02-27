import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { BlogListResponse } from 'shared';
import { api } from '../api/client';
import BlogCard from '../components/ui/BlogCard';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import Spinner from '../components/ui/Spinner';
import { useSEO } from '../hooks/useSEO';

const CATEGORIES = ['all', 'trends', 'outages', 'analysis', 'general'] as const;
const LIMIT = 9;

export default function BlogList() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [data, setData] = useState<BlogListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>('all');

  useSEO({
    title: lang === 'tr' ? 'Blog — Türkiye İnternet Sağlığı ve Kesinti Haberleri' : 'Blog — Turkey Internet Health & Outage News',
    description: lang === 'tr'
      ? 'Türkiye\'nin popüler sitelerinin haftalık kesinti raporları, performans analizleri, Google Trends verileri ve AI destekli teknoloji makaleleri.'
      : 'Weekly outage reports, performance analysis, Google Trends data and AI-powered tech articles about Turkey\'s popular websites.',
  });

  useEffect(() => {
    setLoading(true);
    setError(false);
    const cat = category === 'all' ? undefined : category;
    api.blog.list(page, LIMIT, cat)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page, category]);

  function handleCategoryChange(cat: string) {
    setCategory(cat);
    setPage(1);
  }

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0;

  return (
    <div className="min-h-screen bg-[#09090b] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-violet-500/[0.05] via-transparent to-transparent" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
            </Link>
            <div className="h-5 w-px bg-white/[0.06]" />
            <span className="text-sm font-semibold tracking-tight text-zinc-100">{t('blog.title')}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/turkiye" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              {lang === 'tr' ? 'T\u00fcrkiye Paneli' : 'Turkey Dashboard'}
            </Link>
            <Link to="/login" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              {t('landing.login')}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        {/* Category filter tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => {
            const label = cat === 'all' ? t('blog.allPosts') : t(`blog.${cat}`);
            const isActive = category === cat;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                    : 'text-zinc-500 hover:text-zinc-300 border border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-sm text-zinc-500">{t('common.error')}</p>
          </div>
        ) : !data || data.posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500">{t('blog.noPosts')}</p>
          </div>
        ) : (
          <>
            {/* Blog grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.posts.map((post) => (
                <BlogCard
                  key={post.id}
                  slug={post.slug}
                  title={lang === 'en' && post.title_en ? post.title_en : post.title}
                  excerpt={post.excerpt}
                  category={post.category}
                  publishedAt={post.published_at}
                  tags={post.tags}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs border border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.12] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      p === page
                        ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30'
                        : 'text-zinc-500 hover:text-zinc-300 border border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs border border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.12] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-8">
        <p className="text-[11px] text-zinc-600">
          <Link to="/" className="text-violet-500/70 hover:text-violet-400 transition-colors">
            LiveDetector
          </Link>
        </p>
      </footer>
    </div>
  );
}

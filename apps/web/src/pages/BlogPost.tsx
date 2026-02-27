import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { BlogPost as BlogPostType } from 'shared';
import { api } from '../api/client';
import Spinner from '../components/ui/Spinner';
import LanguageSwitcher from '../components/ui/LanguageSwitcher';
import { useSEO } from '../hooks/useSEO';

const categoryColors: Record<string, string> = {
  trends: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  outages: 'bg-red-500/10 text-red-400 border-red-500/20',
  analysis: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  general: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export default function BlogPost() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [recentPosts, setRecentPosts] = useState<Omit<BlogPostType, 'content' | 'content_en'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    Promise.all([
      api.blog.get(slug),
      api.blog.recent(),
    ])
      .then(([postData, recentData]) => {
        setPost(postData);
        setRecentPosts(recentData.filter((p) => p.slug !== slug).slice(0, 5));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const title = post ? (lang === 'en' && post.title_en ? post.title_en : post.title) : '';
  const content = post ? (lang === 'en' && post.content_en ? post.content_en : post.content) : '';

  useSEO({
    title: title || 'Blog',
    description: post?.excerpt || '',
    ogType: 'article',
    article: post ? {
      publishedTime: post.published_at,
      tags: post.tags,
      section: post.category,
    } : undefined,
  });

  function handleShare(platform: 'twitter' | 'whatsapp' | 'copy') {
    const url = window.location.href;
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-zinc-100 mb-2">{t('notFound.title')}</h1>
          <Link to="/blog" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
            {t('blog.backToBlog')}
          </Link>
        </div>
      </div>
    );
  }

  const categoryLabel = t(`blog.${post.category}`, { defaultValue: post.category });
  const colorClass = categoryColors[post.category] || categoryColors.general;
  const formattedDate = new Date(post.published_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
            <Link to="/blog" className="text-sm font-semibold tracking-tight text-zinc-100 hover:text-violet-300 transition-colors">
              {t('blog.title')}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/turkiye" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              {lang === 'tr' ? 'T\u00fcrkiye Paneli' : 'Turkey Dashboard'}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-10">
          {/* Article */}
          <article className="min-w-0">
            {/* Back link */}
            <Link
              to="/blog"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              {t('blog.backToBlog')}
            </Link>

            {/* Meta */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${colorClass}`}>
                {categoryLabel}
              </span>
              <span className="text-[11px] text-zinc-600">{formattedDate}</span>
              <span className="text-[11px] text-zinc-600">&middot;</span>
              <span className="text-[11px] text-zinc-600">{post.view_count} {t('blog.views')}</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-tight mb-6">{title}</h1>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-8">
                {post.tags.map((tag) => (
                  <span key={tag} className="text-[11px] text-zinc-500 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Content - rendered from admin-authored HTML stored in our database */}
            <div
              className="prose prose-invert prose-sm max-w-none prose-headings:text-zinc-100 prose-p:text-zinc-400 prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-zinc-200 prose-code:text-violet-300 prose-code:bg-white/[0.06] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-white/[0.06] prose-img:rounded-xl prose-blockquote:border-violet-500/30"
              dangerouslySetInnerHTML={{ __html: content }}
            />

            {/* Share buttons */}
            <div className="border-t border-white/[0.06] mt-10 pt-6">
              <p className="text-xs text-zinc-500 mb-3">{t('blog.sharePost')}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShare('twitter')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-zinc-400 hover:text-zinc-200 transition-all"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Twitter
                </button>
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-zinc-400 hover:text-zinc-200 transition-all"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-zinc-400 hover:text-zinc-200 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.854a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L5.88 8.172" />
                  </svg>
                  {copied ? t('common.copied') : t('common.copy')}
                </button>
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="mt-10 lg:mt-0">
            {/* Turkey Dashboard widget */}
            <Link
              to="/turkiye"
              className="block rounded-xl border border-violet-500/20 bg-violet-500/[0.04] hover:bg-violet-500/[0.08] transition-all p-4 mb-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-medium text-zinc-200">
                  {lang === 'tr' ? 'T\u00fcrkiye Site Durum Paneli' : 'Turkey Status Dashboard'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                {lang === 'tr'
                  ? 'T\u00fcrkiye\'nin pop\u00fcler sitelerinin anl\u0131k durumunu g\u00f6r\u00fcn'
                  : 'View real-time status of Turkey\'s popular sites'}
              </p>
            </Link>

            {/* Recent posts */}
            {recentPosts.length > 0 && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <h3 className="text-xs font-semibold text-zinc-300 mb-3">{t('blog.relatedPosts')}</h3>
                <div className="space-y-3">
                  {recentPosts.map((p) => (
                    <Link
                      key={p.id}
                      to={`/blog/${p.slug}`}
                      className="block group"
                    >
                      <p className="text-[13px] text-zinc-400 group-hover:text-zinc-200 transition-colors line-clamp-2">
                        {lang === 'en' && p.title_en ? p.title_en : p.title}
                      </p>
                      <span className="text-[10px] text-zinc-600 mt-0.5 block">
                        {new Date(p.published_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
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

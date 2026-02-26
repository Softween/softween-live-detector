import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Props {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  tags: string[];
}

const categoryColors: Record<string, string> = {
  trends: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  outages: 'bg-red-500/10 text-red-400 border-red-500/20',
  analysis: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  general: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export default function BlogCard({ slug, title, excerpt, category, publishedAt, tags }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const categoryLabel = t(`blog.${category}`, { defaultValue: category });
  const colorClass = categoryColors[category] || categoryColors.general;

  const formattedDate = new Date(publishedAt).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      to={`/blog/${slug}`}
      className="group block rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full border ${colorClass}`}>
            {categoryLabel}
          </span>
          <span className="text-[11px] text-zinc-600">{formattedDate}</span>
        </div>

        <h3 className="text-sm font-semibold text-zinc-100 mb-2 group-hover:text-violet-300 transition-colors line-clamp-2">
          {title}
        </h3>

        <p className="text-[13px] text-zinc-500 leading-relaxed line-clamp-2">
          {excerpt}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] text-zinc-600 bg-white/[0.04] px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <span className="inline-flex items-center gap-1 mt-4 text-xs text-violet-400 group-hover:text-violet-300 transition-colors">
          {t('blog.readMore')}
          <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

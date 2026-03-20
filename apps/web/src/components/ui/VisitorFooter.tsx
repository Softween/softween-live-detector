import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';

const SESSION_KEY = 'visitor_counted';

const SOFTWEEN_LINKS = [
  { href: 'https://softween.com', i18nKey: 'footer.softween' },
  { href: 'https://hesaplayici.softween.com', i18nKey: 'footer.calculators' },
  { href: 'https://tools.softween.com', i18nKey: 'footer.devTools' },
  { href: 'https://exams.softween.com', i18nKey: 'footer.examWorld' },
];

export default function VisitorFooter() {
  const { t } = useTranslation();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    async function trackVisitor() {
      try {
        const alreadyCounted = sessionStorage.getItem(SESSION_KEY);

        if (!alreadyCounted) {
          const result = await api.visitor.increment();
          setCount(result.count);
          sessionStorage.setItem(SESSION_KEY, '1');
        } else {
          const result = await api.visitor.get();
          setCount(result.count);
        }
      } catch {
        // Visitor counter is non-critical
      }
    }

    trackVisitor();
  }, []);

  return (
    <footer className="fixed bottom-0 inset-x-0 z-40 border-t border-zinc-800/50 bg-[#09090b]/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-8 flex items-center justify-between">
        {count !== null && (
          <span className="text-[11px] text-zinc-600 tabular-nums">
            {count.toLocaleString()} {t('footer.visitors')}
          </span>
        )}
        <nav className="flex items-center gap-3 ml-auto" aria-label={t('footer.softweenProducts')}>
          {SOFTWEEN_LINKS.map((link, i) => (
            <span key={link.href} className="flex items-center gap-3">
              {i > 0 && <span className="text-zinc-800">·</span>}
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {t(link.i18nKey)}
              </a>
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}

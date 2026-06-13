import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  noindex?: boolean;
  /** Override the canonical URL. Defaults to current origin + pathname (query/hash stripped). */
  canonical?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  article?: {
    publishedTime?: string;
    tags?: string[];
    section?: string;
  };
}

export function useSEO({ title, description, noindex, canonical, ogType, ogImage, article }: SEOProps) {
  useEffect(() => {
    const suffix = 'LiveDetector';
    const fullTitle = title ? `${title} | ${suffix}` : `${suffix} - Free Uptime Monitoring & Status Pages`;
    document.title = fullTitle;

    // Description
    setMeta('description', description || '');

    // Robots
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // Canonical — self-referential per route so non-home pages aren't folded
    // into the homepage canonical (which left /blog, /turkiye, /blog/* unindexed).
    const canonicalUrl = canonical || `${window.location.origin}${window.location.pathname}`;
    setLink('canonical', canonicalUrl);

    // Open Graph
    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', description || '', 'property');
    setMeta('og:type', ogType || 'website', 'property');
    setMeta('og:url', canonicalUrl, 'property');
    if (ogImage) setMeta('og:image', ogImage, 'property');
    setMeta('og:site_name', 'LiveDetector', 'property');
    setMeta('og:locale', 'tr_TR', 'property');

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image', 'name');
    setMeta('twitter:title', fullTitle, 'name');
    setMeta('twitter:description', description || '', 'name');

    // Article-specific
    if (article?.publishedTime) {
      setMeta('article:published_time', article.publishedTime, 'property');
    }
    if (article?.section) {
      setMeta('article:section', article.section, 'property');
    }
    if (article?.tags) {
      article.tags.forEach(tag => {
        setMeta('article:tag', tag, 'property');
      });
    }

    // JSON-LD structured data
    let ldScript = document.querySelector('script[data-seo-ld]') as HTMLScriptElement | null;
    if (ogType === 'article' && article) {
      if (!ldScript) {
        ldScript = document.createElement('script');
        ldScript.type = 'application/ld+json';
        ldScript.setAttribute('data-seo-ld', 'true');
        document.head.appendChild(ldScript);
      }
      ldScript.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description: description,
        datePublished: article.publishedTime,
        publisher: {
          '@type': 'Organization',
          name: 'LiveDetector',
          url: 'https://livedetector.softween.com',
        },
        mainEntityOfPage: window.location.href,
        keywords: article.tags?.join(', '),
      });
    } else if (ldScript) {
      ldScript.remove();
    }

    return () => {
      // Cleanup JSON-LD on unmount
      const script = document.querySelector('script[data-seo-ld]');
      if (script) script.remove();
    };
  }, [title, description, noindex, canonical, ogType, ogImage, article]);
}

function setMeta(key: string, value: string, attr: 'name' | 'property' = 'name') {
  if (!value) return;
  let tag = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
}

function setLink(rel: string, href: string) {
  let tag = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

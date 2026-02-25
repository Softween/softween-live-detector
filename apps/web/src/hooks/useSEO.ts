import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  noindex?: boolean;
}

export function useSEO({ title, description, noindex }: SEOProps) {
  useEffect(() => {
    const suffix = 'LiveDetector';
    document.title = title ? `${title} | ${suffix}` : `${suffix} - Free Uptime Monitoring & Status Pages`;

    const descTag = document.querySelector('meta[name="description"]');
    if (descTag && description) {
      descTag.setAttribute('content', description);
    }

    const robotsTag = document.querySelector('meta[name="robots"]');
    if (robotsTag) {
      robotsTag.setAttribute('content', noindex ? 'noindex, nofollow' : 'index, follow');
    }
  }, [title, description, noindex]);
}

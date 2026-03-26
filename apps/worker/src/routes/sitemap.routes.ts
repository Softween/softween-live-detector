import { Hono } from 'hono';
import type { Env } from '../env';

const sitemap = new Hono<{ Bindings: Env }>();

sitemap.get('/', async (c) => {
  const baseUrl = 'https://livedetector.softween.com';
  const now = new Date().toISOString().split('T')[0];

  // Static pages
  const staticPages = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/turkiye', changefreq: 'hourly', priority: '0.9' },
    { loc: '/blog', changefreq: 'daily', priority: '0.8' },
  ];

  // Fetch published blog post slugs
  let blogSlugs: { slug: string; published_at: string }[] = [];
  try {
    const result = await c.env.DB.prepare(
      "SELECT slug, published_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 500"
    ).all<{ slug: string; published_at: string }>();
    blogSlugs = result.results ?? [];
  } catch {
    // If DB query fails, continue with static pages only
  }

  // Fetch public status page slugs
  let statusSlugs: { slug: string }[] = [];
  try {
    const result = await c.env.DB.prepare(
      'SELECT slug FROM status_pages WHERE is_public = 1 LIMIT 100'
    ).all<{ slug: string }>();
    statusSlugs = result.results ?? [];
  } catch {
    // Continue without status pages
  }

  const urls = staticPages.map(
    (p) =>
      `  <url>
    <loc>${baseUrl}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
    <lastmod>${now}</lastmod>
  </url>`
  );

  for (const post of blogSlugs) {
    const lastmod = post.published_at
      ? new Date(post.published_at).toISOString().split('T')[0]
      : now;
    urls.push(`  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <lastmod>${lastmod}</lastmod>
  </url>`);
  }

  for (const sp of statusSlugs) {
    urls.push(`  <url>
    <loc>${baseUrl}/status/${sp.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.5</priority>
    <lastmod>${now}</lastmod>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  return c.text(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
});

export { sitemap as sitemapRoutes };

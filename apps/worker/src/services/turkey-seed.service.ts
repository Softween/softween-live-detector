import type { Env } from '../env';

export interface TurkeySiteDefinition {
  name: string;
  url: string;
  category: string;
  sort_order: number;
}

// Only sites that respond to HTTP health checks from Cloudflare Workers.
// Sites with aggressive bot protection (Cloudflare challenges, CAPTCHAs, WAF blocks)
// are excluded as they produce false-down results.
export const TURKEY_SITES: TurkeySiteDefinition[] = [
  // E-Commerce
  { name: 'Trendyol', url: 'https://www.trendyol.com', category: 'ecommerce', sort_order: 0 },
  { name: 'N11', url: 'https://www.n11.com', category: 'ecommerce', sort_order: 2 },
  { name: 'Amazon TR', url: 'https://www.amazon.com.tr', category: 'ecommerce', sort_order: 3 },
  { name: 'Çiçeksepeti', url: 'https://www.ciceksepeti.com', category: 'ecommerce', sort_order: 4 },
  // Banking
  { name: 'Garanti BBVA', url: 'https://www.garantibbva.com.tr', category: 'banking', sort_order: 10 },
  { name: 'İş Bankası', url: 'https://www.isbank.com.tr', category: 'banking', sort_order: 11 },
  { name: 'Akbank', url: 'https://www.akbank.com', category: 'banking', sort_order: 12 },
  // News
  { name: 'Hürriyet', url: 'https://www.hurriyet.com.tr', category: 'news', sort_order: 30 },
  { name: 'Sabah', url: 'https://www.sabah.com.tr', category: 'news', sort_order: 31 },
  { name: 'Sözcü', url: 'https://www.sozcu.com.tr', category: 'news', sort_order: 32 },
  { name: 'NTV', url: 'https://www.ntv.com.tr', category: 'news', sort_order: 33 },
  { name: 'CNN Türk', url: 'https://www.cnnturk.com', category: 'news', sort_order: 34 },
  // Government
  { name: 'e-Devlet', url: 'https://www.turkiye.gov.tr', category: 'gov', sort_order: 40 },
  { name: 'PTT', url: 'https://www.ptt.gov.tr', category: 'gov', sort_order: 41 },
  { name: 'SGK', url: 'https://www.sgk.gov.tr', category: 'gov', sort_order: 42 },
  // Telecom
  { name: 'Turkcell', url: 'https://www.turkcell.com.tr', category: 'telecom', sort_order: 50 },
  // Tech
  { name: 'Letgo', url: 'https://www.letgo.com', category: 'tech', sort_order: 81 },
];

export async function seedTurkeySites(env: Env): Promise<number> {
  const existing = await env.DB.prepare('SELECT COUNT(*) as count FROM turkey_sites').first<{ count: number }>();
  if (existing && existing.count > 0) return existing.count;

  const stmt = env.DB.prepare(
    'INSERT INTO turkey_sites (id, name, url, category, sort_order) VALUES (?, ?, ?, ?, ?)',
  );
  const batch = TURKEY_SITES.map((site) =>
    stmt.bind(crypto.randomUUID(), site.name, site.url, site.category, site.sort_order),
  );
  await env.DB.batch(batch);
  return TURKEY_SITES.length;
}

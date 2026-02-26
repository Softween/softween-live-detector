import type { Env } from '../env';

export interface TurkeySiteDefinition {
  name: string;
  url: string;
  category: string;
  sort_order: number;
}

export const TURKEY_SITES: TurkeySiteDefinition[] = [
  // E-Commerce
  { name: 'Trendyol', url: 'https://www.trendyol.com', category: 'ecommerce', sort_order: 0 },
  { name: 'Hepsiburada', url: 'https://www.hepsiburada.com', category: 'ecommerce', sort_order: 1 },
  { name: 'N11', url: 'https://www.n11.com', category: 'ecommerce', sort_order: 2 },
  { name: 'Amazon TR', url: 'https://www.amazon.com.tr', category: 'ecommerce', sort_order: 3 },
  { name: 'Çiçeksepeti', url: 'https://www.ciceksepeti.com', category: 'ecommerce', sort_order: 4 },
  // Banking
  { name: 'Garanti BBVA', url: 'https://www.garantibbva.com.tr', category: 'banking', sort_order: 10 },
  { name: 'İş Bankası', url: 'https://www.isbank.com.tr', category: 'banking', sort_order: 11 },
  { name: 'Akbank', url: 'https://www.akbank.com', category: 'banking', sort_order: 12 },
  { name: 'Yapı Kredi', url: 'https://www.yapikredi.com.tr', category: 'banking', sort_order: 13 },
  { name: 'Ziraat Bankası', url: 'https://www.ziraatbank.com.tr', category: 'banking', sort_order: 14 },
  // Social Media
  { name: 'X (Twitter)', url: 'https://x.com', category: 'social', sort_order: 20 },
  { name: 'Instagram', url: 'https://www.instagram.com', category: 'social', sort_order: 21 },
  { name: 'YouTube', url: 'https://www.youtube.com', category: 'social', sort_order: 22 },
  { name: 'TikTok', url: 'https://www.tiktok.com', category: 'social', sort_order: 23 },
  { name: 'WhatsApp Web', url: 'https://web.whatsapp.com', category: 'social', sort_order: 24 },
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
  { name: 'Vodafone TR', url: 'https://www.vodafone.com.tr', category: 'telecom', sort_order: 51 },
  { name: 'Türk Telekom', url: 'https://www.turktelekom.com.tr', category: 'telecom', sort_order: 52 },
  // Food & Delivery
  { name: 'Yemeksepeti', url: 'https://www.yemeksepeti.com', category: 'food', sort_order: 60 },
  { name: 'Getir', url: 'https://getir.com', category: 'food', sort_order: 61 },
  // Travel
  { name: 'Türk Hava Yolları', url: 'https://www.turkishairlines.com', category: 'travel', sort_order: 70 },
  { name: 'Obilet', url: 'https://www.obilet.com', category: 'travel', sort_order: 71 },
  { name: 'Enuygun', url: 'https://www.enuygun.com', category: 'travel', sort_order: 72 },
  // Tech
  { name: 'Sahibinden', url: 'https://www.sahibinden.com', category: 'tech', sort_order: 80 },
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

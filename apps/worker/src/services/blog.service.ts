import type { Env } from '../env';
import { BLOG_POSTS_PER_PAGE } from 'shared';
import { fetchTurkeyTrends, getWeeklyOutageData, getPerformanceRankings, cacheTrends } from './trends.service';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Get published posts with pagination
export async function getPublishedPosts(
  env: Env, page: number = 1, limit: number = BLOG_POSTS_PER_PAGE, category?: string,
): Promise<{ posts: any[]; total: number; page: number; limit: number }> {
  const offset = (page - 1) * limit;

  let countQuery = "SELECT COUNT(*) as total FROM blog_posts WHERE status = 'published'";
  let listQuery = `SELECT id, slug, title, title_en, excerpt, category, tags, cover_image_url, view_count, published_at, created_at
    FROM blog_posts WHERE status = 'published'`;

  if (category) {
    countQuery += ' AND category = ?';
    listQuery += ' AND category = ?';
  }

  listQuery += ' ORDER BY published_at DESC LIMIT ? OFFSET ?';

  const countResult = category
    ? await env.DB.prepare(countQuery).bind(category).first<{ total: number }>()
    : await env.DB.prepare(countQuery).first<{ total: number }>();

  const postsResult = category
    ? await env.DB.prepare(listQuery).bind(category, limit, offset).all()
    : await env.DB.prepare(listQuery).bind(limit, offset).all();

  const posts = postsResult.results.map((p: any) => ({
    ...p,
    tags: p.tags ? JSON.parse(p.tags) : [],
  }));

  return { posts, total: countResult?.total || 0, page, limit };
}

// Get single post by slug
export async function getPostBySlug(env: Env, slug: string): Promise<any | null> {
  const post = await env.DB.prepare(
    "SELECT * FROM blog_posts WHERE slug = ? AND status = 'published'",
  ).bind(slug).first();

  if (!post) return null;

  // Increment view count
  await env.DB.prepare(
    'UPDATE blog_posts SET view_count = view_count + 1 WHERE id = ?',
  ).bind((post as any).id).run();

  return { ...(post as any), tags: (post as any).tags ? JSON.parse((post as any).tags) : [] };
}

// Get recent posts
export async function getRecentPosts(env: Env, limit: number = 5): Promise<any[]> {
  const result = await env.DB.prepare(
    `SELECT id, slug, title, excerpt, category, published_at
     FROM blog_posts WHERE status = 'published'
     ORDER BY published_at DESC LIMIT ?`,
  ).bind(limit).all();
  return result.results;
}

// ===== TEMPLATE-BASED CONTENT GENERATION =====

function generateWeeklyOutagePost(
  outageData: { totalIncidents: number; sites: { name: string; url: string; incidents: number; totalDowntimeMin: number }[] },
  weekDate: string,
): { slug: string; title: string; excerpt: string; content: string; tags: string[] } {
  const hasOutages = outageData.totalIncidents > 0;

  const title = hasOutages
    ? `Haftalık Kesinti Raporu: ${weekDate} - ${outageData.totalIncidents} Kesinti Tespit Edildi`
    : `Haftalık Kesinti Raporu: ${weekDate} - Tüm Siteler Stabil`;

  const excerpt = hasOutages
    ? `Bu hafta Türkiye'nin en popüler sitelerinde toplam ${outageData.totalIncidents} kesinti tespit edildi. İşte detaylar...`
    : `Bu hafta Türkiye'nin en popüler sitelerinde kayda değer bir kesinti yaşanmadı. Tüm siteler stabil çalıştı.`;

  let content = `<h2>Haftalık Türkiye İnternet Sağlığı Raporu</h2>\n`;
  content += `<p><strong>Rapor Dönemi:</strong> ${weekDate}</p>\n`;
  content += `<p>LiveDetector olarak Türkiye'nin en çok ziyaret edilen 30+ sitesini 7/24 izliyoruz. İşte bu haftanın özeti:</p>\n\n`;

  if (hasOutages) {
    content += `<h3>Kesinti Yaşayan Siteler</h3>\n`;
    content += `<table><thead><tr><th>Site</th><th>Kesinti Sayısı</th><th>Toplam Süre</th></tr></thead><tbody>\n`;
    for (const site of outageData.sites) {
      content += `<tr><td><a href="${site.url}">${site.name}</a></td><td>${site.incidents}</td><td>${site.totalDowntimeMin} dk</td></tr>\n`;
    }
    content += `</tbody></table>\n\n`;
    content += `<h3>Analiz</h3>\n`;
    content += `<p>Bu hafta en çok kesinti yaşayan site <strong>${outageData.sites[0]?.name || '-'}</strong> oldu. `;
    content += `Toplam ${outageData.totalIncidents} kesinti tespit edildi.</p>\n`;
  } else {
    content += `<h3>Sonuç</h3>\n`;
    content += `<p>Bu hafta izlediğimiz tüm siteler kesintisiz çalıştı. Harika bir hafta!</p>\n`;
  }

  content += `\n<hr>\n<p><em>Bu rapor <a href="https://livedetector.softween.com/turkiye">LiveDetector Türkiye Paneli</a> tarafından otomatik olarak oluşturulmuştur.</em></p>`;

  const tags = ['haftalık-rapor', 'kesinti', 'türkiye'];
  if (outageData.sites.length > 0) {
    tags.push(...outageData.sites.slice(0, 3).map(s => slugify(s.name)));
  }

  return {
    slug: `haftalik-kesinti-raporu-${slugify(weekDate)}`,
    title, excerpt, content,
    tags,
  };
}

function generatePerformancePost(
  perf: { fastest: { name: string; avgMs: number }[]; slowest: { name: string; avgMs: number }[] },
  weekDate: string,
): { slug: string; title: string; excerpt: string; content: string; tags: string[] } {
  const title = `Türkiye Site Performans Sıralaması: ${weekDate}`;
  const excerpt = `Bu haftanın en hızlı ve en yavaş siteleri. ${perf.fastest[0]?.name || '-'} en hızlı yanıt veren site oldu.`;

  let content = `<h2>Haftalık Performans Sıralaması</h2>\n`;
  content += `<p><strong>Dönem:</strong> ${weekDate}</p>\n\n`;

  content += `<h3>En Hızlı 5 Site</h3>\n`;
  content += `<ol>\n`;
  for (const site of perf.fastest) {
    content += `<li><strong>${site.name}</strong> — ${site.avgMs}ms ortalama yanıt süresi</li>\n`;
  }
  content += `</ol>\n\n`;

  content += `<h3>En Yavaş 5 Site</h3>\n`;
  content += `<ol>\n`;
  for (const site of perf.slowest) {
    content += `<li><strong>${site.name}</strong> — ${site.avgMs}ms ortalama yanıt süresi</li>\n`;
  }
  content += `</ol>\n\n`;

  content += `<h3>Analiz</h3>\n`;
  content += `<p>Bu hafta en hızlı site <strong>${perf.fastest[0]?.name || '-'}</strong> (${perf.fastest[0]?.avgMs || 0}ms) olurken, `;
  content += `en yavaş site <strong>${perf.slowest[0]?.name || '-'}</strong> (${perf.slowest[0]?.avgMs || 0}ms) oldu.</p>\n`;
  content += `\n<hr>\n<p><em>Veriler <a href="https://livedetector.softween.com/turkiye">LiveDetector</a> tarafından toplanmıştır.</em></p>`;

  return {
    slug: `performans-siralamasi-${slugify(weekDate)}`,
    title, excerpt, content,
    tags: ['performans', 'hız', 'sıralama', 'türkiye'],
  };
}

function generateTrendPost(
  trend: { title: string; traffic: string },
  weekDate: string,
): { slug: string; title: string; excerpt: string; content: string; tags: string[] } {
  const title = `Türkiye'de Trend: "${trend.title}" - ${weekDate}`;
  const excerpt = `"${trend.title}" bu hafta Türkiye'de en çok aranan konulardan biri oldu. ${trend.traffic ? `Yaklaşık ${trend.traffic} arama yapıldı.` : ''}`;

  let content = `<h2>Trend Analizi: ${trend.title}</h2>\n`;
  content += `<p><strong>Dönem:</strong> ${weekDate}</p>\n`;
  if (trend.traffic) {
    content += `<p><strong>Tahmini Arama Hacmi:</strong> ${trend.traffic}</p>\n`;
  }
  content += `\n<h3>Neden Trend?</h3>\n`;
  content += `<p>"${trend.title}" bu hafta Google Trends Türkiye verilerine göre en çok aranan konulardan biri oldu. `;
  content += `Bu trend, Türk internet kullanıcılarının ilgi alanlarını ve gündemdeki konuları yansıtmaktadır.</p>\n`;
  content += `\n<h3>İnternet Altyapısına Etkisi</h3>\n`;
  content += `<p>Yüksek trafik yaratan trendler, ilgili web sitelerinin performansını etkileyebilir. `;
  content += `LiveDetector olarak bu tür trafik artışlarının Türkiye'deki sitelerin erişilebilirliğini nasıl etkilediğini takip ediyoruz.</p>\n`;
  content += `\n<hr>\n<p><em>Kaynak: Google Trends Türkiye. Analiz <a href="https://livedetector.softween.com">LiveDetector</a> tarafından yapılmıştır.</em></p>`;

  return {
    slug: `trend-${slugify(trend.title)}-${slugify(weekDate)}`,
    title, excerpt, content,
    tags: ['trend', 'google-trends', slugify(trend.title)],
  };
}

// Main weekly generation pipeline
export async function generateWeeklyBlogContent(env: Env): Promise<number> {
  const now = new Date();
  const weekDate = formatDate(now);

  // Check if we already generated this week
  const existing = await env.DB.prepare(
    "SELECT id FROM blog_posts WHERE slug LIKE ? AND created_at >= datetime('now', '-6 days')",
  ).bind(`haftalik-kesinti-raporu-%`).first();
  if (existing) return 0;

  const posts: { slug: string; title: string; excerpt: string; content: string; tags: string[]; category: string }[] = [];

  // 1. Weekly outage report
  const outageData = await getWeeklyOutageData(env);
  const outagePost = generateWeeklyOutagePost(outageData, weekDate);
  posts.push({ ...outagePost, category: 'kesinti' });

  // 2. Performance rankings
  const perfData = await getPerformanceRankings(env);
  if (perfData.fastest.length > 0) {
    const perfPost = generatePerformancePost(perfData, weekDate);
    posts.push({ ...perfPost, category: 'analiz' });
  }

  // 3. Trend post from Google Trends
  const trends = await fetchTurkeyTrends(env);
  if (trends.length > 0) {
    await cacheTrends(env, trends);
    const trendPost = generateTrendPost(trends[0], weekDate);
    posts.push({ ...trendPost, category: 'trend' });
  }

  // Insert all posts
  if (posts.length > 0) {
    const stmt = env.DB.prepare(
      `INSERT INTO blog_posts (id, slug, title, excerpt, content, category, tags, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'))`,
    );
    const batch = posts.map(p =>
      stmt.bind(crypto.randomUUID(), p.slug, p.title, p.excerpt, p.content, p.category, JSON.stringify(p.tags)),
    );
    await env.DB.batch(batch);
  }

  return posts.length;
}

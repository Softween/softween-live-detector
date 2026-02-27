import type { Env } from '../env';
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

interface AiResponse {
  response?: string;
}

const SYSTEM_PROMPT_TR = `Sen "LiveDetector" platformunun kıdemli teknoloji editörüsün. Türkiye'nin internet altyapısı, site performansı ve dijital ekosistemi konusunda derin bilgin var.

YAZIM KURALLARI:
- Profesyonel ama sıcak bir üslup kullan. Okuyucuyla "siz" diye konuş.
- Her paragraf en az 3-4 cümle olsun. Tek cümlelik paragraflar YAZMA.
- Somut veriler, karşılaştırmalar ve örnekler ver. Genel/muğlak ifadelerden kaçın.
- Konuyu farklı açılardan ele al: teknik altyapı, kullanıcı deneyimi, sektörel etki.
- İçerikte doğal şekilde anahtar kelimeler kullan (site çöktü, kesinti, yavaş, erişim sorunu, performans).
- Her bölümü <h3> tag ile başlat. İçeriği <p>, <strong>, <ul>, <li>, <blockquote> taglarıyla formatla.
- <h1> ve <h2> tagı KULLANMA, onlar dışarıda ekleniyor.
- Makale sonunda kısa bir özet ve çağrı-eylem paragrafı ekle.
- Türkçe karakterleri doğru kullan (ğ, ü, ş, ı, ö, ç).
- En az 600 kelime yaz.`;

const SYSTEM_PROMPT_EN = `You are the senior technology editor at "LiveDetector" platform. You have deep expertise in Turkey's internet infrastructure, site performance, and digital ecosystem.

WRITING RULES:
- Use a professional but warm tone. Address readers as "you".
- Each paragraph must have at least 3-4 sentences. Do NOT write single-sentence paragraphs.
- Provide concrete data, comparisons, and examples. Avoid vague/generic statements.
- Cover the topic from multiple angles: technical infrastructure, user experience, industry impact.
- Naturally include SEO keywords (site down, outage, slow, access issues, performance, Turkey).
- Start each section with <h3> tags. Format content with <p>, <strong>, <ul>, <li>, <blockquote> tags.
- Do NOT use <h1> or <h2> tags, those are added externally.
- End with a brief summary and call-to-action paragraph.
- Write at least 600 words.`;

function cleanAIOutput(raw: string): string {
  let html = raw;
  // Fix malformed heading tags: <3>, </3>, <3 ...> → <h3>, </h3>, <h3 ...>
  html = html.replace(/<(\/?)(3|4|5)([\s>])/g, '<$1h$2$3');
  // Fix stray numbered tags like <3> that Llama sometimes outputs
  html = html.replace(/<([2-6])>/g, '<h$1>');
  html = html.replace(/<\/([2-6])>/g, '</h$1>');
  // Remove any <h1> or <h2> the AI might have generated despite instructions
  html = html.replace(/<h[12][^>]*>(.*?)<\/h[12]>/gi, '<h3>$1</h3>');
  // Fix unclosed tags that commonly appear
  html = html.replace(/<(strong|em|p|li|ul|ol|blockquote)([^>]*)>\s*$/gm, '');
  // Remove markdown artifacts the AI sometimes mixes in
  html = html.replace(/^#{1,3}\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Trim whitespace
  html = html.trim();
  return html;
}

async function generateContent(env: Env, systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 3000,
      temperature: 0.7,
    }) as AiResponse;
    const raw = result?.response || '';
    return raw ? cleanAIOutput(raw) : '';
  } catch (e) {
    console.error('AI generation failed:', e);
    return '';
  }
}

// ===== POST GENERATORS =====

async function generateAIOutagePost(
  env: Env,
  outageData: { totalIncidents: number; sites: { name: string; url: string; incidents: number; totalDowntimeMin: number }[] },
  weekDate: string,
) {
  const hasOutages = outageData.totalIncidents > 0;

  let dataBlock: string;
  if (hasOutages) {
    const rows = outageData.sites.map(s =>
      `| ${s.name} | ${s.incidents} kesinti | ${s.totalDowntimeMin} dakika | ${s.url} |`,
    ).join('\n');
    dataBlock = `Toplam ${outageData.totalIncidents} kesinti tespit edildi.\n\nSite | Kesinti | Süre | URL\n${rows}`;
  } else {
    dataBlock = 'Bu hafta izlenen 33 sitenin hiçbirinde kesinti yaşanmadı.';
  }

  const trPrompt = `Tarih: ${weekDate}
Veri kaynağı: LiveDetector Türkiye Paneli (33 popüler Türk sitesini 7/24 izliyor)

${dataBlock}

Bu verilere dayanarak kapsamlı bir haftalık kesinti analiz raporu yaz.

İçerikte şunları ele al:
1. Genel değerlendirme - bu hafta Türkiye'nin internet sağlığı nasıldı?
2. ${hasOutages ? 'Etkilenen sitelerin detaylı analizi - neden çökmüş olabilir? (sunucu yükü, bakım, DDoS, altyapı sorunları vb.)' : 'Neden kesintisiz bir hafta yaşandı? Altyapı yatırımları, CDN kullanımı gibi faktörler.'}
3. Kullanıcılar için pratik tavsiyeler - bir site çöktüğünde ne yapmalı?
4. Türkiye internet altyapısının genel durumu hakkında yorum
5. Önümüzdeki hafta için tahmin ve dikkat edilmesi gerekenler

Makale sonunda LiveDetector Türkiye Paneli'ni (livedetector.softween.com/turkiye) önererek bitir.`;

  const contentTr = await generateContent(env, SYSTEM_PROMPT_TR, trPrompt);
  if (!contentTr) return null;

  const enPrompt = `Date: ${weekDate}
Data source: LiveDetector Turkey Dashboard (monitors 33 popular Turkish sites 24/7)

${dataBlock}

Write a comprehensive weekly outage analysis report based on this data.

Cover these points:
1. Overall assessment - how was Turkey's internet health this week?
2. ${hasOutages ? 'Detailed analysis of affected sites - why might they have gone down? (server load, maintenance, DDoS, infrastructure issues, etc.)' : 'Why was it an outage-free week? Factors like infrastructure investments, CDN usage.'}
3. Practical advice for users - what to do when a site goes down
4. Commentary on the overall state of Turkey's internet infrastructure
5. Predictions and things to watch for next week

End by recommending the LiveDetector Turkey Dashboard (livedetector.softween.com/turkiye).`;

  const contentEn = await generateContent(env, SYSTEM_PROMPT_EN, enPrompt);

  const title = hasOutages
    ? `Haftalık Kesinti Analizi: ${weekDate} — ${outageData.totalIncidents} Kesinti Tespit Edildi`
    : `Haftalık Kesinti Analizi: ${weekDate} — Tüm Siteler Stabil`;
  const titleEn = hasOutages
    ? `Weekly Outage Analysis: ${weekDate} — ${outageData.totalIncidents} Outages Detected`
    : `Weekly Outage Analysis: ${weekDate} — All Sites Stable`;
  const excerpt = hasOutages
    ? `LiveDetector AI analizi: Türkiye'nin en popüler sitelerinde bu hafta ${outageData.totalIncidents} kesinti yaşandı. Nedenleri, etkileri ve kullanıcı tavsiyeleri...`
    : `LiveDetector AI analizi: Bu hafta Türkiye'nin 33 popüler sitesi sorunsuz çalıştı. Altyapı değerlendirmesi ve gelecek hafta öngörüleri...`;

  return {
    slug: `ai-kesinti-analizi-${slugify(weekDate)}`,
    title,
    title_en: titleEn,
    excerpt,
    content: wrapContent(contentTr, title, weekDate, 'outage'),
    content_en: contentEn ? wrapContent(contentEn, titleEn, weekDate, 'outage', true) : null,
    tags: hasOutages
      ? ['kesinti-raporu', 'site-coktu', 'turkiye-internet', ...outageData.sites.slice(0, 3).map(s => slugify(s.name))]
      : ['kesinti-raporu', 'turkiye-internet', 'stabil'],
    category: 'kesinti' as const,
  };
}

async function generateAITrendPost(
  env: Env,
  trends: { title: string; traffic: string }[],
  weekDate: string,
) {
  // Prioritize tech/internet trends
  const techKeywords = ['site', 'uygulama', 'app', 'internet', 'çöktü', 'erişim', 'arıza', 'güncelleme', 'siber', 'hack', 'yapay zeka', 'ai', 'sosyal medya', 'whatsapp', 'instagram', 'twitter', 'youtube', 'tiktok', 'google', 'apple', 'samsung', 'iphone', 'android', 'netflix', 'spotify', 'teknoloji', 'yazılım', 'dolandırıcılık', 'veri', 'gizlilik'];
  const techTrends = trends.filter(t =>
    techKeywords.some(kw => t.title.toLowerCase().includes(kw)),
  );
  const topTrends = techTrends.length >= 2 ? techTrends.slice(0, 3) : trends.slice(0, 3);
  if (topTrends.length === 0) return null;

  const trendsList = topTrends.map(t => `- "${t.title}"${t.traffic ? ` (${t.traffic} arama)` : ''}`).join('\n');
  const mainTrend = topTrends[0];

  const trPrompt = `Tarih: ${weekDate}
Kaynak: Google Trends Türkiye

Bu hafta Türkiye'de en çok aranan konular:
${trendsList}

Ana odak konusu: "${mainTrend.title}"${mainTrend.traffic ? ` — yaklaşık ${mainTrend.traffic} arama yapıldı` : ''}

Bu konuyu merkeze alarak kapsamlı bir trend analizi yaz:

1. Bu konu neden Türkiye'de bu kadar popüler oldu? Arka plan ve bağlam ver.
2. Bu trendin Türkiye'deki internet trafiğine ve dijital ekosisteme etkisi nedir?
3. İlgili web sitelerinin performansı nasıl etkilenmiş olabilir? (Yüksek trafik = potansiyel yavaşlama/çökme)
4. Diğer trend olan konularla (${topTrends.slice(1).map(t => `"${t.title}"`).join(', ')}) bağlantısı var mı?
5. Kullanıcılar bu konuda nelere dikkat etmeli?

LiveDetector'ın Türkiye'deki siteleri 7/24 izlediğini ve trend konularındaki trafik artışlarının performansa etkisini takip ettiğini belirt.`;

  const contentTr = await generateContent(env, SYSTEM_PROMPT_TR, trPrompt);
  if (!contentTr) return null;

  const enPrompt = `Date: ${weekDate}
Source: Google Trends Turkey

Top trending topics in Turkey this week:
${trendsList}

Main focus: "${mainTrend.title}"${mainTrend.traffic ? ` — approximately ${mainTrend.traffic} searches` : ''}

Write a comprehensive trend analysis centered on this topic:

1. Why did this topic become so popular in Turkey? Provide background and context.
2. What is the impact of this trend on Turkey's internet traffic and digital ecosystem?
3. How might related websites' performance be affected? (High traffic = potential slowdowns/crashes)
4. Is there a connection with other trending topics (${topTrends.slice(1).map(t => `"${t.title}"`).join(', ')})?
5. What should users be aware of regarding this topic?

Mention that LiveDetector monitors sites in Turkey 24/7 and tracks how traffic spikes from trending topics affect performance.`;

  const contentEn = await generateContent(env, SYSTEM_PROMPT_EN, enPrompt);

  return {
    slug: `ai-trend-${slugify(mainTrend.title)}-${slugify(weekDate)}`,
    title: `Türkiye'de Bu Hafta: "${mainTrend.title}" Neden Trend? — ${weekDate}`,
    title_en: `Trending in Turkey: "${mainTrend.title}" — ${weekDate}`,
    excerpt: `"${mainTrend.title}" bu hafta Türkiye'de en çok aranan konulardan oldu${mainTrend.traffic ? ` (${mainTrend.traffic} arama)` : ''}. Detaylı analiz ve internet altyapısına etkisi...`,
    content: wrapContent(contentTr, `Trend Analizi: ${mainTrend.title}`, weekDate, 'trend'),
    content_en: contentEn ? wrapContent(contentEn, `Trend Analysis: ${mainTrend.title}`, weekDate, 'trend', true) : null,
    tags: ['google-trends', 'turkiye-trend', ...topTrends.map(t => slugify(t.title))],
    category: 'trend' as const,
  };
}

async function generateAIPerformancePost(
  env: Env,
  perf: { fastest: { name: string; avg_ms: number }[]; slowest: { name: string; avg_ms: number }[] },
  weekDate: string,
) {
  if (perf.fastest.length === 0) return null;

  const fastTable = perf.fastest.map((s, i) => `${i + 1}. ${s.name} — ${s.avg_ms}ms`).join('\n');
  const slowTable = perf.slowest.map((s, i) => `${i + 1}. ${s.name} — ${s.avg_ms}ms`).join('\n');
  const avgFast = Math.round(perf.fastest.reduce((a, s) => a + s.avg_ms, 0) / perf.fastest.length);
  const avgSlow = Math.round(perf.slowest.reduce((a, s) => a + s.avg_ms, 0) / perf.slowest.length);

  const trPrompt = `Tarih: ${weekDate}
Kaynak: LiveDetector Türkiye Paneli — 33 sitenin son 7 günlük ortalama yanıt süreleri

EN HIZLI SİTELER (ortalama: ${avgFast}ms):
${fastTable}

EN YAVAŞ SİTELER (ortalama: ${avgSlow}ms):
${slowTable}

Bu verilere dayanarak detaylı bir performans analizi yaz:

1. Bu haftanın performans şampiyonu ${perf.fastest[0].name} (${perf.fastest[0].avg_ms}ms). Neden bu kadar hızlı olabilir? CDN, edge computing, sunucu optimizasyonu gibi teknik faktörleri tartış.
2. En yavaş site ${perf.slowest[0].name} (${perf.slowest[0].avg_ms}ms). Yavaşlığın olası nedenleri neler? Heavy JavaScript, 3rd-party scriptler, sunucu lokasyonu, veritabanı darboğazı gibi teknik sorunları analiz et.
3. Hızlı ve yavaş siteler arasındaki fark ${avgSlow - avgFast}ms. Bu fark kullanıcı deneyimini nasıl etkiliyor? (Bounce rate, conversion rate, SEO ranking)
4. Türkiye'deki kullanıcılara pratik tavsiyeler: DNS değiştirme, tarayıcı cache temizleme, VPN kullanımı
5. Site sahiplerine performans önerileri: Cloudflare, lazy loading, image optimization

Makale sonunda LiveDetector'ın performans takibi yapabildiğini ve livedetector.softween.com/turkiye adresinden detaylı verilere ulaşılabileceğini belirt.`;

  const contentTr = await generateContent(env, SYSTEM_PROMPT_TR, trPrompt);
  if (!contentTr) return null;

  const enPrompt = `Date: ${weekDate}
Source: LiveDetector Turkey Dashboard — 7-day average response times of 33 sites

FASTEST SITES (average: ${avgFast}ms):
${fastTable}

SLOWEST SITES (average: ${avgSlow}ms):
${slowTable}

Write a detailed performance analysis based on this data:

1. This week's performance champion: ${perf.fastest[0].name} (${perf.fastest[0].avg_ms}ms). Why might it be so fast? Discuss technical factors like CDN, edge computing, server optimization.
2. Slowest site: ${perf.slowest[0].name} (${perf.slowest[0].avg_ms}ms). What could cause the slowness? Analyze technical issues like heavy JavaScript, 3rd-party scripts, server location, database bottlenecks.
3. The ${avgSlow - avgFast}ms gap between fastest and slowest. How does this affect user experience? (Bounce rate, conversion rate, SEO ranking)
4. Practical tips for Turkish users: DNS changes, browser cache clearing, VPN usage
5. Performance recommendations for site owners: Cloudflare, lazy loading, image optimization

End by mentioning LiveDetector's performance monitoring capability and livedetector.softween.com/turkiye.`;

  const contentEn = await generateContent(env, SYSTEM_PROMPT_EN, enPrompt);

  return {
    slug: `ai-performans-analizi-${slugify(weekDate)}`,
    title: `Türkiye Site Hız Raporu: ${weekDate} — En Hızlı ${perf.fastest[0].name}, En Yavaş ${perf.slowest[0].name}`,
    title_en: `Turkey Site Speed Report: ${weekDate} — Fastest ${perf.fastest[0].name}, Slowest ${perf.slowest[0].name}`,
    excerpt: `${perf.fastest[0].name} ${perf.fastest[0].avg_ms}ms ile bu haftanın en hızlı sitesi. ${perf.slowest[0].name} ise ${perf.slowest[0].avg_ms}ms ile en yavaş. AI destekli teknik analiz...`,
    content: wrapContent(contentTr, `Performans Raporu — ${weekDate}`, weekDate, 'performance'),
    content_en: contentEn ? wrapContent(contentEn, `Performance Report — ${weekDate}`, weekDate, 'performance', true) : null,
    tags: ['performans', 'site-hizi', 'turkiye-internet', slugify(perf.fastest[0].name), slugify(perf.slowest[0].name)],
    category: 'analiz' as const,
  };
}

// ===== CONTENT WRAPPER WITH SEO STRUCTURE =====

function wrapContent(
  aiContent: string,
  title: string,
  date: string,
  type: 'outage' | 'trend' | 'performance',
  isEnglish = false,
): string {
  const labels = isEnglish
    ? { source: 'Data Source', platform: 'LiveDetector Turkey Dashboard', auto: 'This article was generated by LiveDetector AI based on real monitoring data.', cta: 'Check real-time status of Turkey\'s popular sites', ctaBtn: 'View Turkey Dashboard', period: 'Report Period' }
    : { source: 'Veri Kaynağı', platform: 'LiveDetector Türkiye Paneli', auto: 'Bu makale, LiveDetector AI tarafından gerçek izleme verileri kullanılarak oluşturulmuştur.', cta: 'Türkiye\'nin popüler sitelerinin anlık durumunu görüntüleyin', ctaBtn: 'Türkiye Paneli\'ni Aç', period: 'Rapor Dönemi' };

  const typeIcon = type === 'outage' ? '🔴' : type === 'trend' ? '📈' : '⚡';

  let html = '';

  // Article header with metadata
  html += `<div style="background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1)); border: 1px solid rgba(139,92,246,0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px;">`;
  html += `<p style="margin: 0 0 8px 0;"><strong>${typeIcon} ${labels.period}:</strong> ${date}</p>`;
  html += `<p style="margin: 0;"><strong>${labels.source}:</strong> <a href="https://livedetector.softween.com/turkiye">${labels.platform}</a></p>`;
  html += `</div>\n\n`;

  // AI content
  html += aiContent;

  // Footer with CTA
  html += `\n\n<hr>\n`;
  html += `<div style="background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.2); border-radius: 12px; padding: 20px; text-align: center; margin-top: 24px;">`;
  html += `<p style="margin: 0 0 12px 0;"><strong>${labels.cta}</strong></p>`;
  html += `<p style="margin: 0;"><a href="https://livedetector.softween.com/turkiye" style="display: inline-block; background: #8b5cf6; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">${labels.ctaBtn}</a></p>`;
  html += `</div>\n`;
  html += `<p style="font-size: 12px; color: #888; text-align: center; margin-top: 16px;"><em>${labels.auto}</em></p>`;

  return html;
}

// ===== MAIN PIPELINE =====

export async function generateAIBlogContent(env: Env): Promise<number> {
  const now = new Date();
  const weekDate = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Deduplication check
  const existing = await env.DB.prepare(
    "SELECT id FROM blog_posts WHERE slug LIKE 'ai-kesinti-analizi-%' AND created_at >= datetime('now', '-6 days')",
  ).first();
  if (existing) return 0;

  const posts: { slug: string; title: string; title_en: string | null; excerpt: string; content: string; content_en: string | null; tags: string[]; category: string }[] = [];

  // 1. AI outage analysis
  const outageData = await getWeeklyOutageData(env);
  const outagePost = await generateAIOutagePost(env, outageData, weekDate);
  if (outagePost) posts.push(outagePost);

  // 2. AI trend article
  const trends = await fetchTurkeyTrends(env);
  if (trends.length > 0) {
    await cacheTrends(env, trends);
    const trendPost = await generateAITrendPost(env, trends, weekDate);
    if (trendPost) posts.push(trendPost);
  }

  // 3. AI performance deep-dive
  const perfData = await getPerformanceRankings(env);
  const perfPost = await generateAIPerformancePost(env, perfData, weekDate);
  if (perfPost) posts.push(perfPost);

  // Insert all posts
  if (posts.length > 0) {
    const stmt = env.DB.prepare(
      `INSERT INTO blog_posts (id, slug, title, title_en, excerpt, content, content_en, category, tags, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', datetime('now'))`,
    );
    const batch = posts.map(p =>
      stmt.bind(
        crypto.randomUUID(), p.slug, p.title, p.title_en, p.excerpt,
        p.content, p.content_en, p.category, JSON.stringify(p.tags),
      ),
    );
    await env.DB.batch(batch);
  }

  return posts.length;
}

// ===== PREVIEW (for testing, returns content without saving) =====

export async function previewAIBlogContent(env: Env): Promise<{
  posts: { title: string; title_en: string | null; excerpt: string; content_preview: string; content_en_preview: string | null; tags: string[]; category: string }[];
  data: { outages: any; trends: any; performance: any };
}> {
  const now = new Date();
  const weekDate = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  const outageData = await getWeeklyOutageData(env);
  const trends = await fetchTurkeyTrends(env);
  const perfData = await getPerformanceRankings(env);

  const posts: any[] = [];

  const outagePost = await generateAIOutagePost(env, outageData, weekDate);
  if (outagePost) posts.push({ ...outagePost, content_preview: outagePost.content.substring(0, 2000), content_en_preview: outagePost.content_en?.substring(0, 2000) || null });

  if (trends.length > 0) {
    const trendPost = await generateAITrendPost(env, trends, weekDate);
    if (trendPost) posts.push({ ...trendPost, content_preview: trendPost.content.substring(0, 2000), content_en_preview: trendPost.content_en?.substring(0, 2000) || null });
  }

  const perfPost = await generateAIPerformancePost(env, perfData, weekDate);
  if (perfPost) posts.push({ ...perfPost, content_preview: perfPost.content.substring(0, 2000), content_en_preview: perfPost.content_en?.substring(0, 2000) || null });

  return {
    posts: posts.map(p => ({
      title: p.title,
      title_en: p.title_en,
      excerpt: p.excerpt,
      content_preview: p.content_preview,
      content_en_preview: p.content_en_preview,
      tags: p.tags,
      category: p.category,
    })),
    data: { outages: outageData, trends: trends.slice(0, 5), performance: perfData },
  };
}

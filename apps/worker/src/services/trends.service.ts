import type { Env } from '../env';

interface TrendItem {
  title: string;
  traffic: string;
  relatedQueries: string[];
}

// Fetch trending searches from Google Trends RSS for Turkey
export async function fetchTurkeyTrends(env: Env): Promise<TrendItem[]> {
  try {
    const response = await fetch(
      'https://trends.google.com/trending/rss?geo=TR',
      { headers: { 'User-Agent': 'LiveDetector/1.0' } },
    );

    if (!response.ok) return [];

    const xml = await response.text();
    // Parse RSS XML - extract title and traffic from each item
    const items: TrendItem[] = [];
    const itemRegex = /<item>[\s\S]*?<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[0];
      const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        || itemXml.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const traffic = itemXml.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1] || '';

      if (title) {
        items.push({ title, traffic, relatedQueries: [] });
      }
    }

    return items.slice(0, 10); // Top 10 trends
  } catch {
    return [];
  }
}

// Get weekly outage data for Turkey sites
export async function getWeeklyOutageData(env: Env): Promise<{
  totalIncidents: number;
  sites: { name: string; url: string; incidents: number; totalDowntimeMin: number }[];
}> {
  const result = await env.DB.prepare(`
    SELECT ts.name, ts.url, COUNT(ti.id) as incidents,
      SUM(
        CASE WHEN ti.resolved_at IS NOT NULL
        THEN ROUND((julianday(ti.resolved_at) - julianday(ti.started_at)) * 1440)
        ELSE ROUND((julianday('now') - julianday(ti.started_at)) * 1440)
        END
      ) as total_downtime_min
    FROM turkey_incidents ti
    JOIN turkey_sites ts ON ti.site_id = ts.id
    WHERE ti.started_at >= datetime('now', '-7 days')
    GROUP BY ts.id
    ORDER BY incidents DESC
  `).all<{ name: string; url: string; incidents: number; total_downtime_min: number }>();

  return {
    totalIncidents: result.results.reduce((a, r) => a + r.incidents, 0),
    sites: result.results.map(r => ({
      name: r.name, url: r.url, incidents: r.incidents, totalDowntimeMin: r.total_downtime_min || 0,
    })),
  };
}

// Get performance rankings for Turkey sites
export async function getPerformanceRankings(env: Env): Promise<{
  fastest: { name: string; avgMs: number }[];
  slowest: { name: string; avgMs: number }[];
}> {
  const result = await env.DB.prepare(`
    SELECT ts.name, ROUND(AVG(tc.response_time_ms)) as avg_ms
    FROM turkey_checks tc
    JOIN turkey_sites ts ON tc.site_id = ts.id
    WHERE tc.checked_at >= datetime('now', '-7 days') AND tc.status = 'up'
    GROUP BY ts.id
    ORDER BY avg_ms ASC
  `).all<{ name: string; avg_ms: number }>();

  return {
    fastest: result.results.slice(0, 5),
    slowest: result.results.slice(-5).reverse(),
  };
}

// Cache trend data
export async function cacheTrends(env: Env, trends: TrendItem[]): Promise<void> {
  const stmt = env.DB.prepare(
    'INSERT INTO trends_cache (id, keyword, trend_data) VALUES (?, ?, ?)',
  );
  const batch = trends.slice(0, 5).map(t =>
    stmt.bind(crypto.randomUUID(), t.title, JSON.stringify(t)),
  );
  if (batch.length > 0) await env.DB.batch(batch);
}

import { TURKEY_CATEGORY_LABELS } from 'shared';
import type { Env } from '../env';
import type { TurkeyDashboard, TurkeySitePublic, TurkeyIncidentPublic, DailyUptime } from 'shared';

export async function getTurkeyDashboard(env: Env): Promise<TurkeyDashboard> {
  // Get all active sites
  const sites = await env.DB.prepare(
    'SELECT * FROM turkey_sites WHERE is_active = 1 ORDER BY sort_order ASC',
  ).all<{
    id: string;
    name: string;
    url: string;
    category: string;
    current_status: string;
    last_response_time_ms: number | null;
    last_checked_at: string | null;
  }>();

  // Get 30-day daily uptime for all sites
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Build site public data with uptime
  const siteDataMap = new Map<string, TurkeySitePublic>();

  for (const site of sites.results) {
    const dailyData = await env.DB.prepare(`
      SELECT DATE(checked_at) as date,
             COUNT(*) as total,
             SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_count
      FROM turkey_checks
      WHERE site_id = ? AND DATE(checked_at) >= ?
      GROUP BY DATE(checked_at)
      ORDER BY date ASC
    `).bind(site.id, thirtyDaysAgo).all<{ date: string; total: number; up_count: number }>();

    const daily_uptime: DailyUptime[] = dailyData.results.map((d) => ({
      date: d.date,
      total: d.total,
      up_count: d.up_count,
      uptime_pct: d.total > 0 ? Math.round((d.up_count / d.total) * 10000) / 100 : 100,
    }));

    const totalChecks = dailyData.results.reduce((a, d) => a + d.total, 0);
    const totalUp = dailyData.results.reduce((a, d) => a + d.up_count, 0);
    const uptime_percentage = totalChecks > 0 ? Math.round((totalUp / totalChecks) * 10000) / 100 : 100;

    siteDataMap.set(site.id, {
      id: site.id,
      name: site.name,
      url: site.url,
      category: site.category,
      current_status: site.current_status as 'up' | 'down' | 'unknown',
      response_time_ms: site.last_response_time_ms,
      uptime_percentage,
      daily_uptime,
    });
  }

  // Group by category
  const categoryMap = new Map<string, TurkeySitePublic[]>();
  for (const site of sites.results) {
    const data = siteDataMap.get(site.id);
    if (!data) continue;
    if (!categoryMap.has(site.category)) categoryMap.set(site.category, []);
    categoryMap.get(site.category)!.push(data);
  }

  const categories = Array.from(categoryMap.entries()).map(([name, catSites]) => ({
    name,
    label_tr: TURKEY_CATEGORY_LABELS[name]?.tr || name,
    label_en: TURKEY_CATEGORY_LABELS[name]?.en || name,
    sites: catSites,
  }));

  // Get recent incidents (last 7 days)
  const incidents = await env.DB.prepare(`
    SELECT ti.started_at, ti.resolved_at, ti.cause, ts.name as site_name, ts.url as site_url
    FROM turkey_incidents ti
    JOIN turkey_sites ts ON ti.site_id = ts.id
    WHERE ti.started_at >= datetime('now', '-7 days')
    ORDER BY ti.started_at DESC
    LIMIT 20
  `).all<{ site_name: string; site_url: string; started_at: string; resolved_at: string | null; cause: string | null }>();

  const recent_incidents: TurkeyIncidentPublic[] = incidents.results.map((i) => ({
    site_name: i.site_name,
    site_url: i.site_url,
    started_at: i.started_at,
    resolved_at: i.resolved_at,
    duration_minutes: i.resolved_at
      ? Math.round((new Date(i.resolved_at).getTime() - new Date(i.started_at).getTime()) / 60000)
      : null,
  }));

  // Calculate overall status
  const allSites = Array.from(siteDataMap.values());
  const sitesDown = allSites.filter((s) => s.current_status === 'down').length;
  const sitesUp = allSites.filter((s) => s.current_status === 'up').length;
  const responseTimes = allSites.filter((s) => s.response_time_ms !== null).map((s) => s.response_time_ms!);
  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 0;

  let overall_status: 'all_up' | 'some_down' | 'major_outage' = 'all_up';
  if (sitesDown > allSites.length * 0.3) overall_status = 'major_outage';
  else if (sitesDown > 0) overall_status = 'some_down';

  return {
    overall_status,
    total_sites: allSites.length,
    sites_up: sitesUp,
    sites_down: sitesDown,
    avg_response_time_ms: avgResponseTime,
    last_updated: new Date().toISOString(),
    categories,
    recent_incidents,
  };
}

import type { SLAReport } from 'shared';
import type { Env } from '../env';

export async function generateSLAReport(
  env: Env,
  monitorId: string,
  userId: string,
  period: '7d' | '30d' | '90d',
  slaTarget: number = 99.9,
): Promise<SLAReport | null> {
  const periodMap = { '7d': 7, '30d': 30, '90d': 90 };
  const days = periodMap[period];

  const monitor = await env.DB.prepare(
    'SELECT id, name FROM monitors WHERE id = ? AND user_id = ?',
  ).bind(monitorId, userId).first<{ id: string; name: string }>();

  if (!monitor) return null;

  const stats = await env.DB.prepare(
    `SELECT
       COUNT(*) as total_checks,
       SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_checks,
       AVG(CASE WHEN response_time_ms IS NOT NULL THEN response_time_ms END) as avg_response_time
     FROM checks
     WHERE monitor_id = ? AND checked_at > datetime('now', '-' || ? || ' days')`,
  ).bind(monitorId, days).first<{ total_checks: number; up_checks: number; avg_response_time: number | null }>();

  const incidents = await env.DB.prepare(
    `SELECT COUNT(*) as count,
       SUM(
         CASE WHEN resolved_at IS NOT NULL
         THEN (julianday(resolved_at) - julianday(started_at)) * 24 * 60
         ELSE (julianday('now') - julianday(started_at)) * 24 * 60
         END
       ) as total_downtime_minutes
     FROM incidents
     WHERE monitor_id = ? AND started_at > datetime('now', '-' || ? || ' days')`,
  ).bind(monitorId, days).first<{ count: number; total_downtime_minutes: number | null }>();

  const uptimePercentage = stats && stats.total_checks > 0
    ? (stats.up_checks / stats.total_checks) * 100
    : 100;

  return {
    monitor_id: monitorId,
    monitor_name: monitor.name,
    period,
    uptime_percentage: Math.round(uptimePercentage * 1000) / 1000,
    total_downtime_minutes: Math.round(incidents?.total_downtime_minutes || 0),
    total_incidents: incidents?.count || 0,
    avg_response_time_ms: Math.round(stats?.avg_response_time || 0),
    sla_target: slaTarget,
    sla_met: uptimePercentage >= slaTarget,
  };
}

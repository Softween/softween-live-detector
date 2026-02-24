import type { Check, MonitorStats, PaginatedResponse } from 'shared';
import type { Env } from '../env';

export async function getCheckHistory(
  env: Env,
  monitorId: string,
  userId: string,
  page: number = 1,
  limit: number = 50,
): Promise<PaginatedResponse<Check>> {
  // Verify ownership
  const monitor = await env.DB.prepare(
    'SELECT id FROM monitors WHERE id = ? AND user_id = ?',
  )
    .bind(monitorId, userId)
    .first();

  if (!monitor) {
    throw new Error('Monitor bulunamadı');
  }

  const offset = (page - 1) * limit;

  const [countResult, dataResult] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) as total FROM checks WHERE monitor_id = ?').bind(monitorId),
    env.DB.prepare(
      'SELECT * FROM checks WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT ? OFFSET ?',
    ).bind(monitorId, limit, offset),
  ]);

  const total = (countResult.results[0] as { total: number }).total;

  return {
    data: dataResult.results as Check[],
    total,
    page,
    limit,
  };
}

export async function getMonitorStats(
  env: Env,
  monitorId: string,
  userId: string,
  period: '24h' | '7d' | '30d' = '24h',
): Promise<MonitorStats> {
  // Verify ownership
  const monitor = await env.DB.prepare(
    'SELECT id, current_status FROM monitors WHERE id = ? AND user_id = ?',
  )
    .bind(monitorId, userId)
    .first<{ id: string; current_status: string }>();

  if (!monitor) {
    throw new Error('Monitor bulunamadı');
  }

  const periodMap = {
    '24h': '-1 day',
    '7d': '-7 days',
    '30d': '-30 days',
  };

  const sinceInterval = periodMap[period];

  const [statsResult, incidentResult] = await env.DB.batch([
    env.DB.prepare(
      `SELECT
         COUNT(*) as total_checks,
         SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_checks,
         AVG(CASE WHEN response_time_ms IS NOT NULL THEN response_time_ms END) as avg_response_time
       FROM checks
       WHERE monitor_id = ? AND checked_at > datetime('now', ?)`,
    ).bind(monitorId, sinceInterval),
    env.DB.prepare(
      `SELECT COUNT(*) as total_incidents FROM incidents
       WHERE monitor_id = ? AND started_at > datetime('now', ?)`,
    ).bind(monitorId, sinceInterval),
  ]);

  const stats = statsResult.results[0] as {
    total_checks: number;
    up_checks: number;
    avg_response_time: number | null;
  };

  const incidents = incidentResult.results[0] as { total_incidents: number };

  const uptimePercentage =
    stats.total_checks > 0
      ? Math.round((stats.up_checks / stats.total_checks) * 10000) / 100
      : 100;

  return {
    monitor_id: monitorId,
    period,
    uptime_percentage: uptimePercentage,
    avg_response_time_ms: Math.round(stats.avg_response_time || 0),
    total_checks: stats.total_checks,
    total_incidents: incidents.total_incidents,
    current_status: monitor.current_status as 'up' | 'down' | 'unknown',
  };
}

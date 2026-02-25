import { Hono } from 'hono';
import { getCheckHistory, getMonitorStats } from '../services/check.service';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../env';

type AuthEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

const checks = new Hono<AuthEnv>();

checks.use('*', authMiddleware);

checks.get('/:monitorId/history', async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('monitorId');
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);

  try {
    const result = await getCheckHistory(c.env, monitorId, userId, page, limit);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Hata oluştu';
    return c.json({ error: message }, 404);
  }
});

checks.get('/:monitorId/stats', async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('monitorId');
  const period = (c.req.query('period') || '24h') as '24h' | '7d' | '30d';

  if (!['24h', '7d', '30d'].includes(period)) {
    return c.json({ error: 'Geçersiz period. 24h, 7d veya 30d kullanın.' }, 400);
  }

  try {
    const stats = await getMonitorStats(c.env, monitorId, userId, period);
    return c.json(stats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Hata oluştu';
    return c.json({ error: message }, 404);
  }
});

// Daily uptime for 90-day bar
checks.get('/:monitorId/daily-uptime', async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('monitorId');
  const days = Math.min(parseInt(c.req.query('days') || '90', 10), 90);

  // Verify ownership
  const monitor = await c.env.DB.prepare(
    'SELECT id FROM monitors WHERE id = ? AND user_id = ?',
  ).bind(monitorId, userId).first();

  if (!monitor) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  const result = await c.env.DB.prepare(
    `SELECT DATE(checked_at) as date,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_count
     FROM checks
     WHERE monitor_id = ? AND checked_at >= datetime('now', '-' || ? || ' days')
     GROUP BY DATE(checked_at)
     ORDER BY date ASC`,
  ).bind(monitorId, days).all<{ date: string; total: number; up_count: number }>();

  const data = result.results.map((d) => ({
    date: d.date,
    total: d.total,
    up_count: d.up_count,
    uptime_pct: d.total > 0 ? Math.round((d.up_count / d.total) * 10000) / 100 : 100,
  }));

  return c.json(data);
});

export { checks as checkRoutes };

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

export { checks as checkRoutes };

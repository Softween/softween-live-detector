import { Hono } from 'hono';
import { generateSLAReport } from '../services/sla.service';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../env';

type SLAEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

const sla = new Hono<SLAEnv>();

sla.get('/:monitorId', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('monitorId');
  const period = (c.req.query('period') || '30d') as '7d' | '30d' | '90d';
  const target = parseFloat(c.req.query('target') || '99.9');

  const report = await generateSLAReport(c.env, monitorId, userId, period, target);
  if (!report) return c.json({ error: 'Monitör bulunamadı' }, 404);

  return c.json(report);
});

export { sla as slaRoutes };

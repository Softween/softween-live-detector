import { Hono } from 'hono';
import { createMonitorSchema, updateMonitorSchema } from 'shared';
import {
  listMonitors,
  getMonitor,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  toggleMonitor,
} from '../services/monitor.service';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../env';

type AuthEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

const monitors = new Hono<AuthEnv>();

monitors.use('*', authMiddleware);

monitors.get('/', async (c) => {
  const userId = c.get('userId');
  const result = await listMonitors(c.env, userId);
  return c.json(result);
});

monitors.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = createMonitorSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  try {
    const monitor = await createMonitor(c.env, userId, parsed.data);
    return c.json(monitor, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Monitör oluşturulamadı';
    return c.json({ error: message }, 400);
  }
});

monitors.get('/:id', async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('id');
  const monitor = await getMonitor(c.env, monitorId, userId);

  if (!monitor) {
    return c.json({ error: 'Monitör bulunamadı' }, 404);
  }

  return c.json(monitor);
});

monitors.put('/:id', async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateMonitorSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const monitor = await updateMonitor(c.env, monitorId, userId, parsed.data);
  if (!monitor) {
    return c.json({ error: 'Monitör bulunamadı' }, 404);
  }

  return c.json(monitor);
});

monitors.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('id');
  const deleted = await deleteMonitor(c.env, monitorId, userId);

  if (!deleted) {
    return c.json({ error: 'Monitör bulunamadı' }, 404);
  }

  return c.json({ success: true });
});

monitors.post('/:id/pause', async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('id');
  const monitor = await toggleMonitor(c.env, monitorId, userId, false);

  if (!monitor) {
    return c.json({ error: 'Monitör bulunamadı' }, 404);
  }

  return c.json(monitor);
});

monitors.post('/:id/resume', async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('id');
  const monitor = await toggleMonitor(c.env, monitorId, userId, true);

  if (!monitor) {
    return c.json({ error: 'Monitör bulunamadı' }, 404);
  }

  return c.json(monitor);
});

export { monitors as monitorRoutes };

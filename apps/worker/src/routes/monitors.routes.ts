import { Hono } from 'hono';
import { createMonitorSchema, updateMonitorSchema } from 'shared';
import type { Check } from 'shared';
import {
  listMonitors,
  getMonitor,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  toggleMonitor,
} from '../services/monitor.service';
import { pingMonitor } from '../services/ping.service';
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
    const message = err instanceof Error ? err.message : 'Monitor could not be created';
    return c.json({ error: message }, 400);
  }
});

monitors.get('/:id', async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('id');
  const monitor = await getMonitor(c.env, monitorId, userId);

  if (!monitor) {
    return c.json({ error: 'Monitor not found' }, 404);
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
    return c.json({ error: 'Monitor not found' }, 404);
  }

  return c.json(monitor);
});

monitors.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('id');
  const deleted = await deleteMonitor(c.env, monitorId, userId);

  if (!deleted) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  return c.json({ success: true });
});

monitors.post('/:id/pause', async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('id');
  const monitor = await toggleMonitor(c.env, monitorId, userId, false);

  if (!monitor) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  return c.json(monitor);
});

monitors.post('/:id/resume', async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('id');
  const monitor = await toggleMonitor(c.env, monitorId, userId, true);

  if (!monitor) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  return c.json(monitor);
});

// Manual ping endpoint
monitors.post('/:id/ping', async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('id');
  const monitor = await getMonitor(c.env, monitorId, userId);

  if (!monitor) {
    return c.json({ error: 'Monitor not found' }, 404);
  }

  const result = await pingMonitor({
    id: monitor.id,
    url: monitor.url,
    method: monitor.method,
    expected_status: monitor.expected_status,
    timeout_ms: monitor.timeout_ms,
    current_status: monitor.current_status,
  });

  // Save the check result
  await c.env.DB.prepare(
    `INSERT INTO checks (id, monitor_id, status, status_code, response_time_ms, error_message)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(result.id, result.monitorId, result.status, result.statusCode, result.responseTime, result.error)
    .run();

  // Update monitor status
  await c.env.DB.prepare(
    "UPDATE monitors SET current_status = ?, last_checked_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
  )
    .bind(result.status, result.monitorId)
    .run();

  // Return the check as a Check object
  const check = await c.env.DB.prepare(
    'SELECT * FROM checks WHERE id = ?',
  )
    .bind(result.id)
    .first<Check>();

  return c.json(check);
});

export { monitors as monitorRoutes };

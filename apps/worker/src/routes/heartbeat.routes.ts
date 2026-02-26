import { Hono } from 'hono';
import { createHeartbeatSchema, updateHeartbeatSchema } from 'shared';
import { listHeartbeats, createHeartbeat, deleteHeartbeat, handleHeartbeatPing } from '../services/heartbeat.service';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../env';

type HBEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

const heartbeat = new Hono<HBEnv>();

// Public endpoint - heartbeat ping
heartbeat.post('/ping/:token', async (c) => {
  const token = c.req.param('token');
  const success = await handleHeartbeatPing(c.env, token);
  if (!success) return c.json({ error: 'Invalid token' }, 404);
  return c.json({ status: 'ok' });
});

heartbeat.post('/ping/:token/fail', async (c) => {
  const token = c.req.param('token');
  const success = await handleHeartbeatPing(c.env, token, true);
  if (!success) return c.json({ error: 'Invalid token' }, 404);
  return c.json({ status: 'fail recorded' });
});

// Authenticated endpoints
heartbeat.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const heartbeats = await listHeartbeats(c.env, userId);
  return c.json(heartbeats);
});

heartbeat.post('/', authMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = createHeartbeatSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.errors[0].message }, 400);

  try {
    const userId = c.get('userId');
    const hb = await createHeartbeat(c.env, userId, parsed.data);
    return c.json(hb, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Oluşturulamadı';
    return c.json({ error: message }, 400);
  }
});

heartbeat.delete('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const deleted = await deleteHeartbeat(c.env, id, userId);
  if (!deleted) return c.json({ error: 'Bulunamadı' }, 404);
  return c.json({ success: true });
});

export { heartbeat as heartbeatRoutes };

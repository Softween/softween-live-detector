import { Hono } from 'hono';
import type { Env } from '../env';

const visitor = new Hono<{ Bindings: Env }>();

const KV_KEY = 'visitor_count';

// POST / — increment and return count (called once per session)
visitor.post('/', async (c) => {
  const current = await c.env.KV.get(KV_KEY);
  const count = (current ? parseInt(current, 10) : 0) + 1;
  await c.env.KV.put(KV_KEY, count.toString());
  return c.json({ count });
});

// GET / — read-only count
visitor.get('/', async (c) => {
  const current = await c.env.KV.get(KV_KEY);
  const count = current ? parseInt(current, 10) : 0;
  return c.json({ count });
});

export { visitor as visitorRoutes };

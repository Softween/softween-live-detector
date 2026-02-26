import { Hono } from 'hono';
import { createApiKeySchema } from 'shared';
import { listApiKeys, createApiKey, deleteApiKey } from '../services/apikey.service';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../env';

type ApiKeyEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

const apikeys = new Hono<ApiKeyEnv>();

apikeys.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const keys = await listApiKeys(c.env, userId);
  return c.json(keys);
});

apikeys.post('/', authMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = createApiKeySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.errors[0].message }, 400);

  try {
    const userId = c.get('userId');
    const result = await createApiKey(c.env, userId, parsed.data.name);
    return c.json({ ...result.apiKey, raw_key: result.rawKey }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Oluşturulamadı';
    return c.json({ error: message }, 400);
  }
});

apikeys.delete('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const deleted = await deleteApiKey(c.env, id, userId);
  if (!deleted) return c.json({ error: 'Bulunamadı' }, 404);
  return c.json({ success: true });
});

export { apikeys as apikeyRoutes };

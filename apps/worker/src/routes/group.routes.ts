import { Hono } from 'hono';
import { createGroupSchema, updateGroupSchema } from 'shared';
import {
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  reorderGroups,
} from '../services/group.service';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../env';

type AuthEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

const groups = new Hono<AuthEnv>();

groups.use('*', authMiddleware);

groups.get('/', async (c) => {
  const userId = c.get('userId');
  const result = await listGroups(c.env, userId);
  return c.json(result);
});

groups.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = createGroupSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  try {
    const group = await createGroup(c.env, userId, parsed.data);
    return c.json(group, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Grup oluşturulamadı';
    return c.json({ error: message }, 400);
  }
});

groups.put('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.req.param('id');
  const body = await c.req.json();
  const parsed = updateGroupSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const group = await updateGroup(c.env, groupId, userId, parsed.data);
  if (!group) {
    return c.json({ error: 'Grup bulunamadı' }, 404);
  }

  return c.json(group);
});

groups.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const groupId = c.req.param('id');
  const deleted = await deleteGroup(c.env, groupId, userId);

  if (!deleted) {
    return c.json({ error: 'Grup bulunamadı' }, 404);
  }

  return c.json({ success: true });
});

groups.put('/reorder', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const { ids } = body as { ids: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'Geçerli bir sıralama listesi gerekli' }, 400);
  }

  await reorderGroups(c.env, userId, ids);
  return c.json({ success: true });
});

export { groups as groupRoutes };

import { Hono } from 'hono';
import { createTagSchema, setMonitorTagsSchema } from 'shared';
import { listTags, createTag, deleteTag, setMonitorTags } from '../services/tag.service';
import { getMonitor } from '../services/monitor.service';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../env';

type AuthEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

const tags = new Hono<AuthEnv>();

tags.use('*', authMiddleware);

tags.get('/', async (c) => {
  const userId = c.get('userId');
  const result = await listTags(c.env, userId);
  return c.json(result);
});

tags.post('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = createTagSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  try {
    const tag = await createTag(c.env, userId, parsed.data);
    return c.json(tag, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Etiket oluşturulamadı';
    return c.json({ error: message }, 400);
  }
});

tags.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const tagId = c.req.param('id');
  const deleted = await deleteTag(c.env, tagId, userId);

  if (!deleted) {
    return c.json({ error: 'Etiket bulunamadı' }, 404);
  }

  return c.json({ success: true });
});

// Set tags for a monitor
tags.put('/monitors/:monitorId', async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('monitorId');
  const body = await c.req.json();
  const parsed = setMonitorTagsSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  // Verify monitor belongs to user
  const monitor = await getMonitor(c.env, monitorId, userId);
  if (!monitor) {
    return c.json({ error: 'Monitör bulunamadı' }, 404);
  }

  try {
    await setMonitorTags(c.env, monitorId, userId, parsed.data.tag_ids);
    return c.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Etiketler güncellenemedi';
    return c.json({ error: message }, 400);
  }
});

export { tags as tagRoutes };

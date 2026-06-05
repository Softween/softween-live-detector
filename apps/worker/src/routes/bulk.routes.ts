import { Hono } from 'hono';
import { bulkImportUrlsSchema, bulkImportSitemapSchema, bulkImportPathBuilderSchema } from 'shared';
import {
  bulkCreateFromUrls,
  fetchSitemapUrls,
  bulkCreateFromPathBuilder,
  getRemainingMonitorSlots,
} from '../services/bulk-import.service';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../env';

type AuthEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

const bulk = new Hono<AuthEnv>();

bulk.use('*', authMiddleware);

// Get remaining monitor slots
bulk.get('/capacity', async (c) => {
  const userId = c.get('userId');
  const remaining = await getRemainingMonitorSlots(c.env, userId);
  return c.json({ remaining, max: 25 });
});

// Bulk create from URL list
bulk.post('/urls', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = bulkImportUrlsSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const result = await bulkCreateFromUrls(c.env, userId, parsed.data.urls, {
    check_interval_seconds: parsed.data.check_interval_seconds,
    timeout_ms: parsed.data.timeout_ms,
    group_id: parsed.data.group_id,
    tag_ids: parsed.data.tag_ids,
  });

  return c.json(result, 201);
});

// Fetch and parse sitemap (returns URLs for user selection)
bulk.post('/sitemap', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = bulkImportSitemapSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  try {
    const result = await fetchSitemapUrls(parsed.data.domain);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sitemap alınamadı';
    return c.json({ error: message }, 400);
  }
});

// Bulk create from base URL + paths
bulk.post('/path-builder', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = bulkImportPathBuilderSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const result = await bulkCreateFromPathBuilder(
    c.env,
    userId,
    parsed.data.base_url,
    parsed.data.paths,
    {
      check_interval_seconds: parsed.data.check_interval_seconds,
      timeout_ms: parsed.data.timeout_ms,
      group_id: parsed.data.group_id,
      tag_ids: parsed.data.tag_ids,
    },
  );

  return c.json(result, 201);
});

export { bulk as bulkRoutes };

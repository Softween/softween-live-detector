import { Hono } from 'hono';
import { updateStatusPageSchema } from 'shared';
import type { StatusPage, IncidentUpdate } from 'shared';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../env';

type AuthEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

const statusPage = new Hono<AuthEnv>();

// --- Public endpoint: get status page by slug (no auth) ---
statusPage.get('/s/:slug', async (c) => {
  const slug = c.req.param('slug');

  const page = await c.env.DB.prepare(
    'SELECT * FROM status_pages WHERE slug = ? AND is_public = 1',
  ).bind(slug).first<StatusPage & { logo_url: string | null; show_subscribe: number }>();

  if (!page) {
    return c.json({ error: 'Status page not found' }, 404);
  }

  // Get monitors linked to this status page with group info
  const monitorsResult = await c.env.DB.prepare(
    `SELECT m.id, m.name, m.current_status, m.group_id,
            COALESCE(g.name, 'Ungrouped') as group_name,
            COALESCE(g.color, '#71717a') as group_color,
            COALESCE(g.sort_order, 999) as group_sort_order,
            spm.sort_order
     FROM status_page_monitors spm
     JOIN monitors m ON spm.monitor_id = m.id
     LEFT JOIN monitor_groups g ON m.group_id = g.id
     WHERE spm.status_page_id = ?
     ORDER BY group_sort_order ASC, spm.sort_order ASC`,
  ).bind(page.id).all<{
    id: string; name: string; current_status: string; group_id: string | null;
    group_name: string; group_color: string; group_sort_order: number; sort_order: number;
  }>();

  const monitors = monitorsResult.results;

  // Get 90-day daily uptime + overall uptime for each monitor
  const monitorsWithUptime = await Promise.all(
    monitors.map(async (m) => {
      const dailyResult = await c.env.DB.prepare(
        `SELECT DATE(checked_at) as date,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_count
         FROM checks
         WHERE monitor_id = ? AND checked_at >= datetime('now', '-90 days')
         GROUP BY DATE(checked_at)
         ORDER BY date ASC`,
      ).bind(m.id).all<{ date: string; total: number; up_count: number }>();

      const daily_uptime = dailyResult.results.map((d) => ({
        date: d.date,
        total: d.total,
        up_count: d.up_count,
        uptime_pct: d.total > 0 ? Math.round((d.up_count / d.total) * 10000) / 100 : 100,
      }));

      const totalChecks = daily_uptime.reduce((s, d) => s + d.total, 0);
      const totalUp = daily_uptime.reduce((s, d) => s + d.up_count, 0);
      const uptime_percentage = totalChecks > 0 ? Math.round((totalUp / totalChecks) * 10000) / 100 : 100;

      return {
        ...m,
        uptime_percentage,
        daily_uptime,
      };
    }),
  );

  // Group monitors
  const groupMap = new Map<string | null, { id: string | null; name: string; color: string; monitors: typeof monitorsWithUptime }>();
  for (const m of monitorsWithUptime) {
    const key = m.group_id;
    if (!groupMap.has(key)) {
      groupMap.set(key, { id: key, name: m.group_name, color: m.group_color, monitors: [] });
    }
    groupMap.get(key)!.monitors.push(m);
  }
  const groups = Array.from(groupMap.values()).map((g) => ({
    id: g.id,
    name: g.name,
    color: g.color,
    monitors: g.monitors.map((m) => ({
      name: m.name,
      current_status: m.current_status as 'up' | 'down' | 'unknown',
      uptime_percentage: m.uptime_percentage,
      daily_uptime: m.daily_uptime,
    })),
  }));

  // Get recent incidents (30 days)
  const monitorIds = monitors.map((m) => m.id);
  let incidents: { monitor_name: string; started_at: string; resolved_at: string | null; cause: string | null; updates: IncidentUpdate[] }[] = [];

  if (monitorIds.length > 0) {
    const placeholders = monitorIds.map(() => '?').join(',');
    const incidentResult = await c.env.DB.prepare(
      `SELECT i.id, i.started_at, i.resolved_at, i.cause, m.name as monitor_name
       FROM incidents i
       JOIN monitors m ON i.monitor_id = m.id
       WHERE i.monitor_id IN (${placeholders}) AND i.started_at >= datetime('now', '-30 days')
       ORDER BY i.started_at DESC
       LIMIT 20`,
    ).bind(...monitorIds).all<{ id: string; started_at: string; resolved_at: string | null; cause: string | null; monitor_name: string }>();

    incidents = await Promise.all(
      incidentResult.results.map(async (inc) => {
        const updatesResult = await c.env.DB.prepare(
          'SELECT * FROM incident_updates WHERE incident_id = ? ORDER BY created_at ASC',
        ).bind(inc.id).all<IncidentUpdate>();

        return {
          monitor_name: inc.monitor_name,
          started_at: inc.started_at,
          resolved_at: inc.resolved_at,
          cause: inc.cause,
          updates: updatesResult.results,
        };
      }),
    );
  }

  // Calculate overall status
  const allStatuses = monitors.map((m) => m.current_status);
  const downCount = allStatuses.filter((s) => s === 'down').length;
  let overall_status: 'operational' | 'degraded' | 'major_outage' | 'maintenance' = 'operational';
  if (downCount > 0 && downCount >= allStatuses.length / 2) {
    overall_status = 'major_outage';
  } else if (downCount > 0) {
    overall_status = 'degraded';
  }

  return c.json({
    title: page.title,
    description: page.description,
    logo_url: page.logo_url || null,
    show_subscribe: page.show_subscribe ?? 1,
    overall_status,
    groups,
    incidents,
  });
});

// Subscribe to status page
statusPage.post('/s/:slug/subscribe', async (c) => {
  const slug = c.req.param('slug');
  const body = await c.req.json();
  const email = body?.email;
  if (!email || typeof email !== 'string') return c.json({ error: 'Email gerekli' }, 400);

  const page = await c.env.DB.prepare(
    'SELECT id FROM status_pages WHERE slug = ? AND is_public = 1',
  ).bind(slug).first<{ id: string }>();
  if (!page) return c.json({ error: 'Sayfa bulunamadı' }, 404);

  const token = crypto.randomUUID().replace(/-/g, '');

  try {
    await c.env.DB.prepare(
      'INSERT INTO status_page_subscribers (id, status_page_id, email, token, confirmed) VALUES (?, ?, ?, ?, 1)',
    ).bind(crypto.randomUUID(), page.id, email, token).run();
  } catch {
    // Already subscribed - ignore duplicate
  }

  return c.json({ success: true });
});

// Unsubscribe
statusPage.get('/unsubscribe/:token', async (c) => {
  const token = c.req.param('token');
  await c.env.DB.prepare(
    'DELETE FROM status_page_subscribers WHERE token = ?',
  ).bind(token).run();
  return c.text('Abonelikten çıktınız / Unsubscribed');
});

// --- Badge endpoint: SVG uptime badge (public, no auth) ---
statusPage.get('/badge/:monitorId', async (c) => {
  const monitorId = c.req.param('monitorId');

  const monitor = await c.env.DB.prepare(
    'SELECT id, name FROM monitors WHERE id = ?',
  ).bind(monitorId).first<{ id: string; name: string }>();

  if (!monitor) {
    return c.text('Not found', 404);
  }

  const statsResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as total,
            SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) as up_count
     FROM checks
     WHERE monitor_id = ? AND checked_at >= datetime('now', '-30 days')`,
  ).bind(monitorId).first<{ total: number; up_count: number }>();

  const uptime = statsResult && statsResult.total > 0
    ? Math.round((statsResult.up_count / statsResult.total) * 10000) / 100
    : 100;

  const color = uptime >= 99 ? '#22c55e' : uptime >= 95 ? '#eab308' : '#ef4444';
  const label = 'uptime';
  const value = `${uptime}%`;
  const labelWidth = 50;
  const valueWidth = 54;
  const totalWidth = labelWidth + valueWidth;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;

  return c.body(svg, 200, {
    'Content-Type': 'image/svg+xml',
    'Cache-Control': 'public, max-age=300',
  });
});

// --- Authenticated endpoints for managing status page ---
statusPage.use('/mine', authMiddleware);
statusPage.use('/mine/*', authMiddleware);

// Get current user's status page config
statusPage.get('/mine', async (c) => {
  const userId = c.get('userId');

  const page = await c.env.DB.prepare(
    'SELECT * FROM status_pages WHERE user_id = ?',
  ).bind(userId).first<StatusPage>();

  if (!page) {
    return c.json({ page: null, monitor_ids: [] });
  }

  const monitorsResult = await c.env.DB.prepare(
    'SELECT monitor_id FROM status_page_monitors WHERE status_page_id = ? ORDER BY sort_order ASC',
  ).bind(page.id).all<{ monitor_id: string }>();

  return c.json({
    page,
    monitor_ids: monitorsResult.results.map((r) => r.monitor_id),
  });
});

// Create or update status page
statusPage.put('/mine', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const parsed = updateStatusPageSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const { slug, title, description, is_public, monitor_ids } = parsed.data;

  // Check slug uniqueness (exclude own page)
  const existingSlug = await c.env.DB.prepare(
    'SELECT id FROM status_pages WHERE slug = ? AND user_id != ?',
  ).bind(slug, userId).first();

  if (existingSlug) {
    return c.json({ error: 'This slug is already taken' }, 400);
  }

  // Verify all monitor_ids belong to this user
  if (monitor_ids.length > 0) {
    const placeholders = monitor_ids.map(() => '?').join(',');
    const ownedResult = await c.env.DB.prepare(
      `SELECT id FROM monitors WHERE id IN (${placeholders}) AND user_id = ?`,
    ).bind(...monitor_ids, userId).all<{ id: string }>();

    if (ownedResult.results.length !== monitor_ids.length) {
      return c.json({ error: 'Some monitors do not belong to you' }, 400);
    }
  }

  // Upsert status page
  const existing = await c.env.DB.prepare(
    'SELECT id FROM status_pages WHERE user_id = ?',
  ).bind(userId).first<{ id: string }>();

  let pageId: string;

  if (existing) {
    pageId = existing.id;
    await c.env.DB.prepare(
      "UPDATE status_pages SET slug = ?, title = ?, description = ?, is_public = ?, updated_at = datetime('now') WHERE id = ?",
    ).bind(slug, title, description || null, is_public ? 1 : 0, pageId).run();
  } else {
    pageId = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO status_pages (id, user_id, slug, title, description, is_public) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(pageId, userId, slug, title, description || null, is_public ? 1 : 0).run();
  }

  // Replace monitors
  await c.env.DB.prepare(
    'DELETE FROM status_page_monitors WHERE status_page_id = ?',
  ).bind(pageId).run();

  for (let i = 0; i < monitor_ids.length; i++) {
    await c.env.DB.prepare(
      'INSERT INTO status_page_monitors (id, status_page_id, monitor_id, sort_order) VALUES (?, ?, ?, ?)',
    ).bind(crypto.randomUUID(), pageId, monitor_ids[i], i).run();
  }

  const page = await c.env.DB.prepare(
    'SELECT * FROM status_pages WHERE id = ?',
  ).bind(pageId).first<StatusPage>();

  return c.json({ page, monitor_ids });
});

export { statusPage as statusPageRoutes };

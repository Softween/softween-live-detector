import { Hono } from 'hono';
import { getTurkeyDashboard } from '../services/turkey.service';
import { seedTurkeySites } from '../services/turkey-seed.service';
import type { Env } from '../env';

const turkey = new Hono<{ Bindings: Env }>();

// Main dashboard data
turkey.get('/', async (c) => {
  // Auto-seed on first request if table is empty
  await seedTurkeySites(c.env);

  const dashboard = await getTurkeyDashboard(c.env);
  return c.json(dashboard);
});

// Recent incidents
turkey.get('/incidents', async (c) => {
  const incidents = await c.env.DB.prepare(`
    SELECT ti.*, ts.name as site_name, ts.url as site_url
    FROM turkey_incidents ti
    JOIN turkey_sites ts ON ti.site_id = ts.id
    WHERE ti.started_at >= datetime('now', '-30 days')
    ORDER BY ti.started_at DESC
    LIMIT 50
  `).all();
  return c.json(incidents.results);
});

export { turkey as turkeyRoutes };

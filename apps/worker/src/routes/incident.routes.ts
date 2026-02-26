import { Hono } from 'hono';
import { incidentUpdateSchema } from 'shared';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../env';

type IncidentEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

const incidents = new Hono<IncidentEnv>();

// Get incidents for a monitor with their updates
incidents.get('/:monitorId', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const monitorId = c.req.param('monitorId');

  // Verify ownership
  const monitor = await c.env.DB.prepare(
    'SELECT id FROM monitors WHERE id = ? AND user_id = ?',
  ).bind(monitorId, userId).first();
  if (!monitor) return c.json({ error: 'Monitör bulunamadı' }, 404);

  const result = await c.env.DB.prepare(
    'SELECT * FROM incidents WHERE monitor_id = ? ORDER BY started_at DESC LIMIT 50',
  ).bind(monitorId).all<{ id: string; monitor_id: string; started_at: string; resolved_at: string | null; cause: string | null }>();

  // Get updates for each incident
  const incidentsWithUpdates = await Promise.all(
    result.results.map(async (incident) => {
      const updates = await c.env.DB.prepare(
        'SELECT * FROM incident_updates WHERE incident_id = ? ORDER BY created_at ASC',
      ).bind(incident.id).all();
      return { ...incident, updates: updates.results };
    }),
  );

  return c.json(incidentsWithUpdates);
});

// Add an update to an incident
incidents.post('/:incidentId/updates', authMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = incidentUpdateSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.errors[0].message }, 400);

  const userId = c.get('userId');
  const incidentId = c.req.param('incidentId');

  // Verify ownership through monitor
  const incident = await c.env.DB.prepare(
    `SELECT i.id FROM incidents i
     JOIN monitors m ON i.monitor_id = m.id
     WHERE i.id = ? AND m.user_id = ?`,
  ).bind(incidentId, userId).first();
  if (!incident) return c.json({ error: 'Olay bulunamadı' }, 404);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO incident_updates (id, incident_id, status, message) VALUES (?, ?, ?, ?)',
  ).bind(id, incidentId, parsed.data.status, parsed.data.message).run();

  // If status is resolved, also resolve the incident
  if (parsed.data.status === 'resolved') {
    await c.env.DB.prepare(
      "UPDATE incidents SET resolved_at = datetime('now') WHERE id = ?",
    ).bind(incidentId).run();
  }

  return c.json({ id, incident_id: incidentId, status: parsed.data.status, message: parsed.data.message }, 201);
});

export { incidents as incidentRoutes };

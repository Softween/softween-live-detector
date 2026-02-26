import { Hono } from 'hono';
import { createTeamSchema, inviteTeamMemberSchema } from 'shared';
import { getTeam, createTeam, getTeamMembers, createInvite, acceptInvite, removeMember } from '../services/team.service';
import { authMiddleware } from '../middleware/auth';
import { sendEmail } from '../lib/resend';
import type { Env } from '../env';

type TeamEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

const teams = new Hono<TeamEnv>();

teams.get('/', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const team = await getTeam(c.env, userId);
  if (!team) return c.json(null);
  const members = await getTeamMembers(c.env, team.id);
  return c.json({ ...team, members });
});

teams.post('/', authMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.errors[0].message }, 400);

  try {
    const userId = c.get('userId');
    const team = await createTeam(c.env, userId, parsed.data.name);
    return c.json(team, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Oluşturulamadı';
    return c.json({ error: message }, 400);
  }
});

teams.post('/invite', authMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = inviteTeamMemberSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.errors[0].message }, 400);

  const userId = c.get('userId');
  const team = await getTeam(c.env, userId);
  if (!team) return c.json({ error: 'Ekip bulunamadı' }, 404);

  const token = await createInvite(c.env, team.id, parsed.data.email, parsed.data.role);
  const inviteUrl = `${c.env.FRONTEND_URL}/team-invite?token=${token}`;

  c.executionCtx.waitUntil(
    sendEmail({
      to: parsed.data.email,
      subject: `LiveDetector - ${team.name} ekibine davet`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#7c3aed;">Ekip Daveti</h2>
        <p>${team.name} ekibine davet edildiniz.</p>
        <a href="${inviteUrl}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Daveti Kabul Et</a>
        <p style="color:#6b7280;font-size:12px;">LiveDetector</p>
      </div>`,
    }, c.env.RESEND_API_KEY),
  );

  return c.json({ success: true });
});

teams.post('/accept-invite', authMiddleware, async (c) => {
  const { token } = await c.req.json();
  if (!token) return c.json({ error: 'Token gerekli' }, 400);

  const userId = c.get('userId');
  const success = await acceptInvite(c.env, token, userId);
  if (!success) return c.json({ error: 'Geçersiz davet' }, 400);
  return c.json({ success: true });
});

teams.delete('/members/:memberId', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const memberId = c.req.param('memberId');
  const team = await getTeam(c.env, userId);
  if (!team) return c.json({ error: 'Ekip bulunamadı' }, 404);

  const success = await removeMember(c.env, team.id, memberId);
  if (!success) return c.json({ error: 'Üye kaldırılamadı' }, 400);
  return c.json({ success: true });
});

export { teams as teamRoutes };

import type { Team, TeamMember } from 'shared';
import type { Env } from '../env';

export async function getTeam(env: Env, userId: string): Promise<Team | null> {
  return env.DB.prepare(
    'SELECT * FROM teams WHERE owner_id = ?',
  ).bind(userId).first<Team>();
}

export async function createTeam(env: Env, userId: string, name: string): Promise<Team> {
  const existing = await getTeam(env, userId);
  if (existing) throw new Error('Zaten bir ekibiniz var');

  const id = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO teams (id, name, owner_id) VALUES (?, ?, ?)',
  ).bind(id, name, userId).run();

  // Add owner as member
  await env.DB.prepare(
    "INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, 'owner', datetime('now'))",
  ).bind(crypto.randomUUID(), id, userId).run();

  return (await env.DB.prepare('SELECT * FROM teams WHERE id = ?').bind(id).first<Team>())!;
}

export async function getTeamMembers(env: Env, teamId: string): Promise<(TeamMember & { email: string; name: string })[]> {
  const result = await env.DB.prepare(
    `SELECT tm.*, u.email, u.name FROM team_members tm
     JOIN users u ON tm.user_id = u.id
     WHERE tm.team_id = ? ORDER BY tm.invited_at ASC`,
  ).bind(teamId).all<TeamMember & { email: string; name: string }>();
  return result.results;
}

export async function createInvite(env: Env, teamId: string, email: string, role: string): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, '');
  await env.DB.prepare(
    'INSERT INTO team_invites (id, team_id, email, token, role) VALUES (?, ?, ?, ?, ?)',
  ).bind(crypto.randomUUID(), teamId, email, token, role).run();
  return token;
}

export async function acceptInvite(env: Env, token: string, userId: string): Promise<boolean> {
  const invite = await env.DB.prepare(
    'SELECT * FROM team_invites WHERE token = ?',
  ).bind(token).first<{ id: string; team_id: string; email: string; role: string }>();

  if (!invite) return false;

  await env.DB.prepare(
    "INSERT INTO team_members (id, team_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, datetime('now'))",
  ).bind(crypto.randomUUID(), invite.team_id, userId, invite.role).run();

  await env.DB.prepare('DELETE FROM team_invites WHERE id = ?').bind(invite.id).run();
  return true;
}

export async function removeMember(env: Env, teamId: string, memberId: string): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM team_members WHERE team_id = ? AND id = ? AND role != 'owner'",
  ).bind(teamId, memberId).run();
  return result.meta.changes > 0;
}

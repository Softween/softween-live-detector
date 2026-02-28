import { MAX_GROUPS_PER_USER } from 'shared';
import type { MonitorGroup } from 'shared';
import type { Env } from '../env';

export async function listGroups(env: Env, userId: string): Promise<MonitorGroup[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM monitor_groups WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC',
  )
    .bind(userId)
    .all<MonitorGroup>();
  return result.results;
}

export async function getGroup(env: Env, groupId: string, userId: string): Promise<MonitorGroup | null> {
  return env.DB.prepare('SELECT * FROM monitor_groups WHERE id = ? AND user_id = ?')
    .bind(groupId, userId)
    .first<MonitorGroup>();
}

export async function createGroup(
  env: Env,
  userId: string,
  data: { name: string; description?: string; color?: string },
): Promise<MonitorGroup> {
  const countResult = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM monitor_groups WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ count: number }>();

  if (countResult && countResult.count >= MAX_GROUPS_PER_USER) {
    throw new Error(`Maksimum ${MAX_GROUPS_PER_USER} grup oluşturabilirsiniz`);
  }

  const id = crypto.randomUUID();
  const sortOrder = countResult?.count || 0;

  await env.DB.prepare(
    `INSERT INTO monitor_groups (id, user_id, name, description, color, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, userId, data.name, data.description || null, data.color || '#8b5cf6', sortOrder)
    .run();

  return (await env.DB.prepare('SELECT * FROM monitor_groups WHERE id = ?').bind(id).first<MonitorGroup>())!;
}

export async function updateGroup(
  env: Env,
  groupId: string,
  userId: string,
  data: Partial<{ name: string; description: string | null; color: string; sort_order: number }>,
): Promise<MonitorGroup | null> {
  const existing = await getGroup(env, groupId, userId);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description || null); }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
  if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }

  if (fields.length === 0) return existing;

  fields.push("updated_at = datetime('now')");
  values.push(groupId, userId);

  await env.DB.prepare(
    `UPDATE monitor_groups SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
  )
    .bind(...values)
    .run();

  return getGroup(env, groupId, userId);
}

export async function deleteGroup(env: Env, groupId: string, userId: string): Promise<boolean> {
  const result = await env.DB.prepare(
    'DELETE FROM monitor_groups WHERE id = ? AND user_id = ?',
  )
    .bind(groupId, userId)
    .run();
  return result.meta.changes > 0;
}

export async function reorderGroups(env: Env, userId: string, ids: string[]): Promise<void> {
  const stmts = ids.map((id, index) =>
    env.DB.prepare('UPDATE monitor_groups SET sort_order = ? WHERE id = ? AND user_id = ?')
      .bind(index, id, userId),
  );
  if (stmts.length > 0) {
    await env.DB.batch(stmts);
  }
}

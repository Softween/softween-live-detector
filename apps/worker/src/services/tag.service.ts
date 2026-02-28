import { MAX_TAGS_PER_USER } from 'shared';
import type { Tag } from 'shared';
import type { Env } from '../env';

export async function listTags(env: Env, userId: string): Promise<Tag[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC',
  )
    .bind(userId)
    .all<Tag>();
  return result.results;
}

export async function getTag(env: Env, tagId: string, userId: string): Promise<Tag | null> {
  return env.DB.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?')
    .bind(tagId, userId)
    .first<Tag>();
}

export async function createTag(
  env: Env,
  userId: string,
  data: { name: string; color?: string },
): Promise<Tag> {
  const countResult = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM tags WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ count: number }>();

  if (countResult && countResult.count >= MAX_TAGS_PER_USER) {
    throw new Error(`Maksimum ${MAX_TAGS_PER_USER} etiket oluşturabilirsiniz`);
  }

  // Check for duplicate name
  const existing = await env.DB.prepare(
    'SELECT id FROM tags WHERE user_id = ? AND name = ?',
  )
    .bind(userId, data.name)
    .first();

  if (existing) {
    throw new Error('Bu isimde bir etiket zaten mevcut');
  }

  const id = crypto.randomUUID();

  await env.DB.prepare(
    'INSERT INTO tags (id, user_id, name, color) VALUES (?, ?, ?, ?)',
  )
    .bind(id, userId, data.name, data.color || '#6366f1')
    .run();

  return (await env.DB.prepare('SELECT * FROM tags WHERE id = ?').bind(id).first<Tag>())!;
}

export async function deleteTag(env: Env, tagId: string, userId: string): Promise<boolean> {
  const result = await env.DB.prepare(
    'DELETE FROM tags WHERE id = ? AND user_id = ?',
  )
    .bind(tagId, userId)
    .run();
  return result.meta.changes > 0;
}

export async function getMonitorTags(env: Env, monitorId: string): Promise<Tag[]> {
  const result = await env.DB.prepare(
    `SELECT t.* FROM tags t
     INNER JOIN monitor_tags mt ON mt.tag_id = t.id
     WHERE mt.monitor_id = ?
     ORDER BY t.name ASC`,
  )
    .bind(monitorId)
    .all<Tag>();
  return result.results;
}

export async function setMonitorTags(
  env: Env,
  monitorId: string,
  userId: string,
  tagIds: string[],
): Promise<void> {
  // Verify all tags belong to user
  if (tagIds.length > 0) {
    const placeholders = tagIds.map(() => '?').join(',');
    const validTags = await env.DB.prepare(
      `SELECT id FROM tags WHERE id IN (${placeholders}) AND user_id = ?`,
    )
      .bind(...tagIds, userId)
      .all<{ id: string }>();

    if (validTags.results.length !== tagIds.length) {
      throw new Error('Geçersiz etiket ID');
    }
  }

  // Delete existing tags for this monitor
  await env.DB.prepare('DELETE FROM monitor_tags WHERE monitor_id = ?')
    .bind(monitorId)
    .run();

  // Insert new tags
  if (tagIds.length > 0) {
    const stmts = tagIds.map((tagId) =>
      env.DB.prepare('INSERT INTO monitor_tags (monitor_id, tag_id) VALUES (?, ?)')
        .bind(monitorId, tagId),
    );
    await env.DB.batch(stmts);
  }
}

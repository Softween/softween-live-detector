import { MAX_API_KEYS_PER_USER } from 'shared';
import type { ApiKey } from 'shared';
import type { Env } from '../env';

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function listApiKeys(env: Env, userId: string): Promise<ApiKey[]> {
  const result = await env.DB.prepare(
    'SELECT id, user_id, name, key_prefix, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC',
  ).bind(userId).all<ApiKey>();
  return result.results;
}

export async function createApiKey(
  env: Env,
  userId: string,
  name: string,
): Promise<{ apiKey: ApiKey; rawKey: string }> {
  const count = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?',
  ).bind(userId).first<{ count: number }>();

  if (count && count.count >= MAX_API_KEYS_PER_USER) {
    throw new Error(`Maksimum ${MAX_API_KEYS_PER_USER} API anahtarı oluşturabilirsiniz`);
  }

  const id = crypto.randomUUID();
  const rawKey = `ld_${crypto.randomUUID().replace(/-/g, '')}`;
  const keyHash = await hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 10);

  await env.DB.prepare(
    'INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix) VALUES (?, ?, ?, ?, ?)',
  ).bind(id, userId, name, keyHash, keyPrefix).run();

  const apiKey = (await env.DB.prepare(
    'SELECT id, user_id, name, key_prefix, last_used_at, created_at FROM api_keys WHERE id = ?',
  ).bind(id).first<ApiKey>())!;

  return { apiKey, rawKey };
}

export async function deleteApiKey(env: Env, id: string, userId: string): Promise<boolean> {
  const result = await env.DB.prepare(
    'DELETE FROM api_keys WHERE id = ? AND user_id = ?',
  ).bind(id, userId).run();
  return result.meta.changes > 0;
}

export async function validateApiKey(env: Env, rawKey: string): Promise<string | null> {
  const keyHash = await hashKey(rawKey);
  const row = await env.DB.prepare(
    'SELECT user_id FROM api_keys WHERE key_hash = ?',
  ).bind(keyHash).first<{ user_id: string }>();

  if (!row) return null;

  // Update last_used_at
  await env.DB.prepare(
    "UPDATE api_keys SET last_used_at = datetime('now') WHERE key_hash = ?",
  ).bind(keyHash).run();

  return row.user_id;
}

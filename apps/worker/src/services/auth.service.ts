import { hashPassword, verifyPassword } from '../lib/crypto';
import type { Env } from '../env';

export async function registerUser(
  env: Env,
  email: string,
  password: string,
  name: string,
): Promise<{ id: string; email: string; name: string }> {
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first();

  if (existing) {
    throw new Error('Bu email adresi zaten kayıtlı');
  }

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();

  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, password_salt, name) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, email, hash, salt, name)
    .run();

  // Create default notification settings
  await env.DB.prepare(
    'INSERT INTO notification_settings (id, user_id, email_enabled, cooldown_minutes) VALUES (?, ?, 1, 15)',
  )
    .bind(crypto.randomUUID(), id)
    .run();

  return { id, email, name };
}

export async function loginUser(
  env: Env,
  email: string,
  password: string,
): Promise<{ id: string; email: string; name: string } | null> {
  const user = await env.DB.prepare(
    'SELECT id, email, name, password_hash, password_salt FROM users WHERE email = ?',
  )
    .bind(email)
    .first<{
      id: string;
      email: string;
      name: string;
      password_hash: string;
      password_salt: string;
    }>();

  if (!user) return null;

  const valid = await verifyPassword(password, user.password_hash, user.password_salt);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name };
}

export async function getUserById(
  env: Env,
  userId: string,
): Promise<{ id: string; email: string; name: string; created_at: string } | null> {
  return env.DB.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?')
    .bind(userId)
    .first();
}

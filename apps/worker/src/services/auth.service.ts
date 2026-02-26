import { hashPassword, verifyPassword } from '../lib/crypto';
import type { Env } from '../env';

export async function registerUser(
  env: Env,
  email: string,
  password: string,
  name: string,
): Promise<{ id: string; email: string; name: string; email_verified: number }> {
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first();

  if (existing) {
    throw new Error('Bu email adresi zaten kayıtlı');
  }

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();

  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, password_salt, name, email_verified) VALUES (?, ?, ?, ?, ?, 0)',
  )
    .bind(id, email, hash, salt, name)
    .run();

  // Create default notification settings
  await env.DB.prepare(
    'INSERT INTO notification_settings (id, user_id, email_enabled, cooldown_minutes) VALUES (?, ?, 1, 15)',
  )
    .bind(crypto.randomUUID(), id)
    .run();

  return { id, email, name, email_verified: 0 };
}

export async function loginUser(
  env: Env,
  email: string,
  password: string,
): Promise<{ id: string; email: string; name: string; email_verified: number } | null> {
  const user = await env.DB.prepare(
    'SELECT id, email, name, email_verified, password_hash, password_salt FROM users WHERE email = ?',
  )
    .bind(email)
    .first<{
      id: string;
      email: string;
      name: string;
      email_verified: number;
      password_hash: string;
      password_salt: string;
    }>();

  if (!user) return null;

  const valid = await verifyPassword(password, user.password_hash, user.password_salt);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name, email_verified: user.email_verified };
}

export async function getUserById(
  env: Env,
  userId: string,
): Promise<{ id: string; email: string; name: string; email_verified: number; created_at: string } | null> {
  return env.DB.prepare('SELECT id, email, name, email_verified, created_at FROM users WHERE id = ?')
    .bind(userId)
    .first();
}

export async function changePassword(
  env: Env,
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const user = await env.DB.prepare(
    'SELECT password_hash, password_salt FROM users WHERE id = ?',
  )
    .bind(userId)
    .first<{ password_hash: string; password_salt: string }>();

  if (!user) return false;

  const valid = await verifyPassword(currentPassword, user.password_hash, user.password_salt);
  if (!valid) return false;

  const { hash, salt } = await hashPassword(newPassword);
  await env.DB.prepare(
    "UPDATE users SET password_hash = ?, password_salt = ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(hash, salt, userId)
    .run();

  return true;
}

export async function resetPasswordWithToken(
  env: Env,
  token: string,
  newPassword: string,
): Promise<boolean> {
  const userId = await env.KV.get(`reset:${token}`);
  if (!userId) return false;

  const { hash, salt } = await hashPassword(newPassword);
  await env.DB.prepare(
    "UPDATE users SET password_hash = ?, password_salt = ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(hash, salt, userId)
    .run();

  await env.KV.delete(`reset:${token}`);
  return true;
}

export async function createPasswordResetToken(
  env: Env,
  email: string,
): Promise<{ token: string; userId: string } | null> {
  const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: string }>();

  if (!user) return null;

  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
  await env.KV.put(`reset:${token}`, user.id, { expirationTtl: 3600 }); // 1 hour

  return { token, userId: user.id };
}

export async function createEmailVerificationToken(
  env: Env,
  userId: string,
): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
  await env.KV.put(`verify:${token}`, userId, { expirationTtl: 86400 }); // 24 hours
  return token;
}

export async function verifyEmail(
  env: Env,
  token: string,
): Promise<boolean> {
  const userId = await env.KV.get(`verify:${token}`);
  if (!userId) return false;

  await env.DB.prepare(
    "UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(userId)
    .run();

  await env.KV.delete(`verify:${token}`);
  return true;
}

export async function deleteAccount(
  env: Env,
  userId: string,
  password: string,
): Promise<boolean> {
  const user = await env.DB.prepare(
    'SELECT password_hash, password_salt FROM users WHERE id = ?',
  )
    .bind(userId)
    .first<{ password_hash: string; password_salt: string }>();

  if (!user) return false;

  const valid = await verifyPassword(password, user.password_hash, user.password_salt);
  if (!valid) return false;

  // Delete all user data in order (respecting foreign keys)
  await env.DB.batch([
    env.DB.prepare('DELETE FROM status_page_monitors WHERE status_page_id IN (SELECT id FROM status_pages WHERE user_id = ?)').bind(userId),
    env.DB.prepare('DELETE FROM status_pages WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM notification_log WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM notification_settings WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM checks WHERE monitor_id IN (SELECT id FROM monitors WHERE user_id = ?)').bind(userId),
    env.DB.prepare('DELETE FROM incidents WHERE monitor_id IN (SELECT id FROM monitors WHERE user_id = ?)').bind(userId),
    env.DB.prepare('DELETE FROM monitors WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ]);

  return true;
}

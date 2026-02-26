import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Geçerli bir email adresi girin').max(255),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı').max(128),
  name: z.string().min(1, 'İsim gerekli').max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir email adresi girin'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı').max(128),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, 'Şifre en az 8 karakter olmalı').max(128),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

export const createMonitorSchema = z.object({
  name: z.string().min(1, 'İsim gerekli').max(100),
  url: z.string().url('Geçerli bir URL girin').max(2000),
  method: z.enum(['GET', 'HEAD']).optional().default('GET'),
  expected_status: z.number().int().min(100).max(599).optional().default(200),
  timeout_ms: z.number().int().min(1000).max(30000).optional().default(10000),
  check_keyword: z.string().max(500).optional().or(z.literal('')),
});

export const updateMonitorSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().max(2000).optional(),
  method: z.enum(['GET', 'HEAD']).optional(),
  expected_status: z.number().int().min(100).max(599).optional(),
  timeout_ms: z.number().int().min(1000).max(30000).optional(),
  check_keyword: z.string().max(500).optional().or(z.literal('')).or(z.null()),
  maintenance_start: z.string().optional().or(z.literal('')).or(z.null()),
  maintenance_end: z.string().optional().or(z.literal('')).or(z.null()),
});

export const updateNotificationSettingsSchema = z.object({
  email_enabled: z.boolean(),
  cooldown_minutes: z.enum(['5', '15', '30', '60']).transform(Number),
  webhook_url: z.string().url().max(2000).optional().or(z.literal('')),
  webhook_enabled: z.boolean().optional(),
  slow_threshold_ms: z.number().int().min(100).max(60000).optional().or(z.null()),
  slow_alert_enabled: z.boolean().optional(),
});

export const updateStatusPageSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens'),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  is_public: z.boolean(),
  monitor_ids: z.array(z.string()).max(20),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type CreateMonitorInput = z.infer<typeof createMonitorSchema>;
export type UpdateMonitorInput = z.infer<typeof updateMonitorSchema>;
export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;
export type UpdateStatusPageInput = z.infer<typeof updateStatusPageSchema>;

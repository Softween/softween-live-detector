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
  check_interval_seconds: z.number().int().min(60).max(600).optional().default(300),
  custom_headers: z.string().max(5000).optional().or(z.literal('')),
  monitor_type: z.enum(['http', 'tcp', 'dns', 'ping']).optional().default('http'),
  port: z.number().int().min(1).max(65535).optional().or(z.null()),
  check_regions: z.string().max(200).optional().default('auto'),
  group_id: z.string().optional().or(z.null()),
  tag_ids: z.array(z.string()).max(10).optional(),
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
  check_interval_seconds: z.number().int().min(60).max(600).optional(),
  custom_headers: z.string().max(5000).optional().or(z.literal('')).or(z.null()),
  monitor_type: z.enum(['http', 'tcp', 'dns', 'ping']).optional(),
  port: z.number().int().min(1).max(65535).optional().or(z.null()),
  check_regions: z.string().max(200).optional(),
  group_id: z.string().optional().or(z.null()),
});

// Monitor Groups
export const createGroupSchema = z.object({
  name: z.string().min(1, 'İsim gerekli').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  color: z.string().max(20).optional().default('#8b5cf6'),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().or(z.literal('')).or(z.null()),
  color: z.string().max(20).optional(),
  sort_order: z.number().int().min(0).optional(),
});

// Tags
export const createTagSchema = z.object({
  name: z.string().min(1, 'İsim gerekli').max(50),
  color: z.string().max(20).optional().default('#6366f1'),
});

export const setMonitorTagsSchema = z.object({
  tag_ids: z.array(z.string()).max(10),
});

// Bulk Import
export const bulkImportUrlsSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(25),
  group_id: z.string().optional().or(z.null()),
  tag_ids: z.array(z.string()).max(10).optional(),
  check_interval_seconds: z.number().int().min(60).max(600).optional().default(300),
  timeout_ms: z.number().int().min(1000).max(30000).optional().default(10000),
});

export const bulkImportSitemapSchema = z.object({
  domain: z.string().url('Geçerli bir URL girin').max(2000),
});

export const bulkImportPathBuilderSchema = z.object({
  base_url: z.string().url('Geçerli bir URL girin').max(2000),
  paths: z.array(z.string().max(500)).min(1).max(25),
  group_id: z.string().optional().or(z.null()),
  tag_ids: z.array(z.string()).max(10).optional(),
  check_interval_seconds: z.number().int().min(60).max(600).optional().default(300),
  timeout_ms: z.number().int().min(1000).max(30000).optional().default(10000),
});

export const updateNotificationSettingsSchema = z.object({
  email_enabled: z.boolean(),
  cooldown_minutes: z.enum(['5', '15', '30', '60']).transform(Number),
  webhook_url: z.string().url().max(2000).optional().or(z.literal('')),
  webhook_enabled: z.boolean().optional(),
  slow_threshold_ms: z.number().int().min(100).max(60000).optional().or(z.null()),
  slow_alert_enabled: z.boolean().optional(),
  telegram_bot_token: z.string().max(200).optional().or(z.literal('')),
  telegram_chat_id: z.string().max(100).optional().or(z.literal('')),
  telegram_enabled: z.boolean().optional(),
  weekly_report_enabled: z.boolean().optional(),
});

export const updateStatusPageSchema = z.object({
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens'),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  is_public: z.boolean(),
  monitor_ids: z.array(z.string()).max(20),
});

export const createHeartbeatSchema = z.object({
  name: z.string().min(1, 'İsim gerekli').max(100),
  expected_interval_seconds: z.number().int().min(60).max(86400).optional().default(300),
  grace_period_seconds: z.number().int().min(0).max(3600).optional().default(60),
});

export const updateHeartbeatSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  expected_interval_seconds: z.number().int().min(60).max(86400).optional(),
  grace_period_seconds: z.number().int().min(0).max(3600).optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'İsim gerekli').max(100),
});

export const createTeamSchema = z.object({
  name: z.string().min(1, 'İsim gerekli').max(100),
});

export const inviteTeamMemberSchema = z.object({
  email: z.string().email('Geçerli bir email adresi girin'),
  role: z.enum(['admin', 'viewer']).optional().default('viewer'),
});

export const incidentUpdateSchema = z.object({
  status: z.enum(['investigating', 'identified', 'monitoring', 'resolved']),
  message: z.string().min(1, 'Mesaj gerekli').max(2000),
});

export const subscribeStatusPageSchema = z.object({
  email: z.string().email('Geçerli bir email adresi girin'),
});

export const verify2FASchema = z.object({
  code: z.string().length(6, '6 haneli kod girin'),
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
export type CreateHeartbeatInput = z.infer<typeof createHeartbeatSchema>;
export type UpdateHeartbeatInput = z.infer<typeof updateHeartbeatSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;
export type IncidentUpdateInput = z.infer<typeof incidentUpdateSchema>;
export type SubscribeStatusPageInput = z.infer<typeof subscribeStatusPageSchema>;
export type Verify2FAInput = z.infer<typeof verify2FASchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type SetMonitorTagsInput = z.infer<typeof setMonitorTagsSchema>;
export type BulkImportUrlsInput = z.infer<typeof bulkImportUrlsSchema>;
export type BulkImportSitemapInput = z.infer<typeof bulkImportSitemapSchema>;
export type BulkImportPathBuilderInput = z.infer<typeof bulkImportPathBuilderSchema>;

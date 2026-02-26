import type { Monitor, MonitorStats, Check, PaginatedResponse, DailyUptime, StatusPage, StatusPagePublic } from 'shared';
import i18n from '../i18n';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const API_BASE = import.meta.env.VITE_API_URL || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const fallback = i18n.t('common.error');
    const data = await response.json().catch(() => ({ error: fallback }));
    throw new ApiError(response.status, data.error || fallback);
  }

  return response.json();
}

async function requestRaw(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
  });
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; name: string }) =>
      request<{ id: string; email: string; name: string; email_verified: number }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ id: string; email: string; name: string; email_verified: number }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
    me: () => request<{ id: string; email: string; name: string; email_verified: number; created_at: string }>('/api/auth/me'),
    forgotPassword: (email: string) =>
      request<{ success: boolean }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    resetPassword: (token: string, password: string) =>
      request<{ success: boolean }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }),
    verifyEmail: (token: string) =>
      request<{ success: boolean }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    resendVerification: () =>
      request<{ success: boolean }>('/api/auth/resend-verification', { method: 'POST' }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ success: boolean }>('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      }),
    deleteAccount: (password: string) =>
      request<{ success: boolean }>('/api/auth/account', {
        method: 'DELETE',
        body: JSON.stringify({ password }),
      }),
    getNotifications: () =>
      request<{ email_enabled: boolean; cooldown_minutes: number; webhook_url: string; webhook_enabled: boolean; slow_threshold_ms: number | null; slow_alert_enabled: boolean }>('/api/auth/notifications'),
    updateNotifications: (data: { email_enabled: boolean; cooldown_minutes: string; webhook_url?: string; webhook_enabled?: boolean; slow_threshold_ms?: number | null; slow_alert_enabled?: boolean }) =>
      request<{ email_enabled: boolean; cooldown_minutes: number; webhook_url: string; webhook_enabled: boolean; slow_threshold_ms: number | null; slow_alert_enabled: boolean }>('/api/auth/notifications', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  monitors: {
    list: () => request<Monitor[]>('/api/monitors'),
    get: (id: string) => request<Monitor>(`/api/monitors/${id}`),
    create: (data: { name: string; url: string; method?: string; expected_status?: number; timeout_ms?: number; check_keyword?: string }) =>
      request<Monitor>('/api/monitors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; url: string; method: string; expected_status: number; timeout_ms: number; check_keyword: string | null; maintenance_start: string | null; maintenance_end: string | null }>) =>
      request<Monitor>(`/api/monitors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/api/monitors/${id}`, { method: 'DELETE' }),
    pause: (id: string) => request<Monitor>(`/api/monitors/${id}/pause`, { method: 'POST' }),
    resume: (id: string) => request<Monitor>(`/api/monitors/${id}/resume`, { method: 'POST' }),
    ping: (id: string) => request<Check>(`/api/monitors/${id}/ping`, { method: 'POST' }),
  },
  checks: {
    history: (monitorId: string, page = 1, limit = 50) =>
      request<PaginatedResponse<Check>>(`/api/checks/${monitorId}/history?page=${page}&limit=${limit}`),
    stats: (monitorId: string, period: '24h' | '7d' | '30d' = '24h') =>
      request<MonitorStats>(`/api/checks/${monitorId}/stats?period=${period}`),
    dailyUptime: (monitorId: string, days = 90) =>
      request<DailyUptime[]>(`/api/checks/${monitorId}/daily-uptime?days=${days}`),
    exportData: (monitorId: string, format: 'csv' | 'json' = 'csv') =>
      requestRaw(`/api/checks/${monitorId}/export?format=${format}`),
  },
  visitor: {
    increment: () => request<{ count: number }>('/api/visitor', { method: 'POST' }),
    get: () => request<{ count: number }>('/api/visitor'),
  },
  statusPage: {
    getMine: () => request<{ page: StatusPage | null; monitor_ids: string[] }>('/api/status-page/mine'),
    updateMine: (data: { slug: string; title: string; description?: string; is_public: boolean; monitor_ids: string[] }) =>
      request<{ page: StatusPage; monitor_ids: string[] }>('/api/status-page/mine', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    getPublic: (slug: string) => request<StatusPagePublic>(`/api/status-page/s/${slug}`),
  },
};

export { ApiError };

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

export const api = {
  auth: {
    register: (data: { email: string; password: string; name: string }) =>
      request<{ id: string; email: string; name: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{ id: string; email: string; name: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
    me: () => request<{ id: string; email: string; name: string; created_at: string }>('/api/auth/me'),
    getNotifications: () =>
      request<{ email_enabled: boolean; cooldown_minutes: number; webhook_url: string; webhook_enabled: boolean }>('/api/auth/notifications'),
    updateNotifications: (data: { email_enabled: boolean; cooldown_minutes: string; webhook_url?: string; webhook_enabled?: boolean }) =>
      request<{ email_enabled: boolean; cooldown_minutes: number; webhook_url: string; webhook_enabled: boolean }>('/api/auth/notifications', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  monitors: {
    list: () => request<Monitor[]>('/api/monitors'),
    get: (id: string) => request<Monitor>(`/api/monitors/${id}`),
    create: (data: { name: string; url: string; method?: string; expected_status?: number; timeout_ms?: number }) =>
      request<Monitor>('/api/monitors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; url: string; method: string; expected_status: number; timeout_ms: number }>) =>
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

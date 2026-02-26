import type { Monitor, MonitorStats, Check, PaginatedResponse, DailyUptime, StatusPage, StatusPagePublic, HeartbeatMonitor, ApiKey, Team, TeamMember, WebhookLog, SLAReport, IncidentUpdate, TurkeyDashboard, TurkeyIncidentPublic, BlogPost, BlogListResponse } from 'shared';
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
      request<{ email_enabled: boolean; cooldown_minutes: number; webhook_url: string; webhook_enabled: boolean; slow_threshold_ms: number | null; slow_alert_enabled: boolean; telegram_bot_token: string | null; telegram_chat_id: string | null; telegram_enabled: boolean; weekly_report_enabled: boolean }>('/api/auth/notifications'),
    updateNotifications: (data: { email_enabled: boolean; cooldown_minutes: string; webhook_url?: string; webhook_enabled?: boolean; slow_threshold_ms?: number | null; slow_alert_enabled?: boolean; telegram_bot_token?: string | null; telegram_chat_id?: string | null; telegram_enabled?: boolean; weekly_report_enabled?: boolean }) =>
      request<{ email_enabled: boolean; cooldown_minutes: number; webhook_url: string; webhook_enabled: boolean; slow_threshold_ms: number | null; slow_alert_enabled: boolean; telegram_bot_token: string | null; telegram_chat_id: string | null; telegram_enabled: boolean; weekly_report_enabled: boolean }>('/api/auth/notifications', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },
  monitors: {
    list: () => request<Monitor[]>('/api/monitors'),
    get: (id: string) => request<Monitor>(`/api/monitors/${id}`),
    create: (data: { name: string; url: string; method?: string; expected_status?: number; timeout_ms?: number; check_keyword?: string; check_interval_seconds?: number; custom_headers?: string; monitor_type?: string; port?: number; check_regions?: string }) =>
      request<Monitor>('/api/monitors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; url: string; method: string; expected_status: number; timeout_ms: number; check_keyword: string | null; maintenance_start: string | null; maintenance_end: string | null; check_interval_seconds: number; custom_headers: string | null; monitor_type: string; port: number | null; check_regions: string }>) =>
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
    subscribe: (slug: string, email: string) =>
      request<{ success: boolean }>(`/api/status-page/s/${slug}/subscribe`, { method: 'POST', body: JSON.stringify({ email }) }),
  },
  heartbeats: {
    list: () => request<HeartbeatMonitor[]>('/api/heartbeat'),
    create: (data: { name: string; expected_interval_seconds?: number; grace_period_seconds?: number }) =>
      request<HeartbeatMonitor>('/api/heartbeat', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => request<{ success: boolean }>(`/api/heartbeat/${id}`, { method: 'DELETE' }),
  },
  apiKeys: {
    list: () => request<ApiKey[]>('/api/apikeys'),
    create: (name: string) =>
      request<{ key: ApiKey; raw_key: string }>('/api/apikeys', { method: 'POST', body: JSON.stringify({ name }) }),
    delete: (id: string) => request<{ success: boolean }>(`/api/apikeys/${id}`, { method: 'DELETE' }),
  },
  teams: {
    get: () => request<{ team: Team; members: TeamMember[] }>('/api/teams'),
    create: (name: string) =>
      request<Team>('/api/teams', { method: 'POST', body: JSON.stringify({ name }) }),
    invite: (email: string, role?: string) =>
      request<{ success: boolean }>('/api/teams/invite', { method: 'POST', body: JSON.stringify({ email, role }) }),
    acceptInvite: (token: string) =>
      request<{ success: boolean }>('/api/teams/accept-invite', { method: 'POST', body: JSON.stringify({ token }) }),
    removeMember: (memberId: string) =>
      request<{ success: boolean }>(`/api/teams/members/${memberId}`, { method: 'DELETE' }),
  },
  incidents: {
    list: (monitorId: string) =>
      request<{ incidents: Array<{ id: string; started_at: string; resolved_at: string | null; cause: string | null; updates: IncidentUpdate[] }> }>(`/api/incidents/${monitorId}`),
    addUpdate: (incidentId: string, data: { status: string; message: string }) =>
      request<IncidentUpdate>(`/api/incidents/${incidentId}/updates`, { method: 'POST', body: JSON.stringify(data) }),
  },
  sla: {
    report: (monitorId: string, period?: string, target?: number) => {
      const params = new URLSearchParams();
      if (period) params.set('period', period);
      if (target) params.set('target', String(target));
      return request<SLAReport>(`/api/sla/${monitorId}?${params}`);
    },
  },
  webhooks: {
    test: () => request<{ success: boolean; status_code?: number; error?: string }>('/api/webhooks/test', { method: 'POST' }),
    logs: () => request<WebhookLog[]>('/api/webhooks/logs'),
  },
  turkey: {
    getDashboard: () => request<TurkeyDashboard>('/api/turkey'),
    getIncidents: () => request<TurkeyIncidentPublic[]>('/api/turkey/incidents'),
  },
  blog: {
    list: (page = 1, limit = 10, category?: string) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (category) params.set('category', category);
      return request<BlogListResponse>('/api/blog?' + params);
    },
    get: (slug: string) => request<BlogPost>('/api/blog/' + slug),
    recent: () => request<Omit<BlogPost, 'content' | 'content_en'>[]>('/api/blog/recent'),
  },
};

export { ApiError };

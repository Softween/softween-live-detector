export interface User {
  id: string;
  email: string;
  name: string;
  email_verified: number;
  totp_enabled: number;
  created_at: string;
  updated_at: string;
}

export interface Monitor {
  id: string;
  user_id: string;
  name: string;
  url: string;
  method: string;
  expected_status: number;
  timeout_ms: number;
  is_active: number;
  current_status: 'up' | 'down' | 'unknown';
  last_checked_at: string | null;
  check_keyword: string | null;
  maintenance_start: string | null;
  maintenance_end: string | null;
  ssl_expiry_at: string | null;
  ssl_issuer: string | null;
  check_interval_seconds: number;
  custom_headers: string | null;
  monitor_type: 'http' | 'tcp' | 'dns' | 'ping';
  port: number | null;
  domain_expiry_at: string | null;
  check_regions: string;
  group_id: string | null;
  group_name?: string;
  group_color?: string;
  tags?: Tag[];
  created_at: string;
  updated_at: string;
}

export interface MonitorGroup {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface BulkImportResult {
  created: number;
  failed: { url: string; error: string }[];
}

export interface SitemapParseResult {
  urls: string[];
  total: number;
}

export interface Check {
  id: string;
  monitor_id: string;
  status: 'up' | 'down';
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  region: string | null;
  checked_at: string;
}

export interface Incident {
  id: string;
  monitor_id: string;
  started_at: string;
  resolved_at: string | null;
  cause: string | null;
}

export interface IncidentUpdate {
  id: string;
  incident_id: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  message: string;
  created_at: string;
}

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_enabled: number;
  cooldown_minutes: number;
  slow_threshold_ms: number | null;
  slow_alert_enabled: number;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  telegram_enabled: number;
  weekly_report_enabled: number;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  monitor_id: string;
  type: 'down' | 'up' | 'slow' | 'ssl' | 'domain' | 'heartbeat';
  sent_at: string;
}

export interface MonitorStats {
  monitor_id: string;
  period: '24h' | '7d' | '30d';
  uptime_percentage: number;
  avg_response_time_ms: number;
  total_checks: number;
  total_incidents: number;
  current_status: 'up' | 'down' | 'unknown';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  error: string;
}

export interface StatusPage {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string | null;
  is_public: number;
  created_at: string;
  updated_at: string;
}

export interface StatusPageMonitor {
  id: string;
  status_page_id: string;
  monitor_id: string;
  sort_order: number;
}

export interface DailyUptime {
  date: string;
  total: number;
  up_count: number;
  uptime_pct: number;
}

export interface StatusPageMonitorPublic {
  name: string;
  current_status: 'up' | 'down' | 'unknown';
  uptime_percentage: number;
  daily_uptime: DailyUptime[];
}

export interface StatusPagePublic {
  title: string;
  description: string | null;
  logo_url: string | null;
  show_subscribe: number;
  overall_status: 'operational' | 'degraded' | 'major_outage' | 'maintenance';
  groups: {
    id: string | null;
    name: string;
    color: string;
    monitors: StatusPageMonitorPublic[];
  }[];
  incidents: {
    monitor_name: string;
    started_at: string;
    resolved_at: string | null;
    cause: string | null;
    updates: IncidentUpdate[];
  }[];
}

export interface HeartbeatMonitor {
  id: string;
  user_id: string;
  name: string;
  token: string;
  expected_interval_seconds: number;
  grace_period_seconds: number;
  status: 'up' | 'down' | 'unknown';
  last_ping_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'viewer';
  invited_at: string;
  joined_at: string | null;
}

export interface WebhookLog {
  id: string;
  user_id: string;
  url: string;
  status_code: number | null;
  response_body: string | null;
  error: string | null;
  sent_at: string;
}

export interface SLAReport {
  monitor_id: string;
  monitor_name: string;
  period: string;
  uptime_percentage: number;
  total_downtime_minutes: number;
  total_incidents: number;
  avg_response_time_ms: number;
  sla_target: number;
  sla_met: boolean;
}

// Turkey Public Dashboard
export interface TurkeySite {
  id: string;
  name: string;
  url: string;
  category: string;
  icon_url: string | null;
  sort_order: number;
  is_active: number;
  current_status: 'up' | 'down' | 'unknown';
  last_response_time_ms: number | null;
  last_checked_at: string | null;
  created_at: string;
}

export interface TurkeySitePublic {
  id: string;
  name: string;
  url: string;
  category: string;
  current_status: 'up' | 'down' | 'unknown';
  response_time_ms: number | null;
  uptime_percentage: number;
  daily_uptime: DailyUptime[];
}

export interface TurkeyIncidentPublic {
  site_name: string;
  site_url: string;
  started_at: string;
  resolved_at: string | null;
  duration_minutes: number | null;
}

export interface TurkeyDashboard {
  overall_status: 'all_up' | 'some_down' | 'major_outage';
  total_sites: number;
  sites_up: number;
  sites_down: number;
  avg_response_time_ms: number;
  last_updated: string;
  categories: {
    name: string;
    label_tr: string;
    label_en: string;
    sites: TurkeySitePublic[];
  }[];
  recent_incidents: TurkeyIncidentPublic[];
}

// Blog
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  excerpt: string;
  content: string;
  content_en: string | null;
  category: string;
  tags: string[];
  cover_image_url: string | null;
  view_count: number;
  published_at: string;
  created_at: string;
}

export interface BlogListResponse {
  posts: Omit<BlogPost, 'content' | 'content_en'>[];
  total: number;
  page: number;
  limit: number;
}

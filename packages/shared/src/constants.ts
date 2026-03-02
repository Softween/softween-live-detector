export const MAX_MONITORS_PER_USER = 25;
export const MAX_HEARTBEATS_PER_USER = 5;
export const MAX_API_KEYS_PER_USER = 5;
export const DEFAULT_CHECK_INTERVAL_SECONDS = 300;
export const DEFAULT_TIMEOUT_MS = 10000;
export const DEFAULT_COOLDOWN_MINUTES = 15;
export const DATA_RETENTION_DAYS = 30;
export const NOTIFICATION_LOG_RETENTION_DAYS = 90;
export const CRON_BATCH_SIZE = 25;
export const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
export const SSL_WARN_DAYS = [30, 7, 1]; // Days before expiry to warn
export const DOMAIN_WARN_DAYS = [30, 7, 1];
export const CHECK_REGIONS = ['auto', 'us', 'eu', 'asia'] as const;
export const MONITOR_TYPES = ['http', 'tcp', 'dns', 'ping'] as const;
export const INCIDENT_STATUSES = ['investigating', 'identified', 'monitoring', 'resolved'] as const;
export const TEAM_ROLES = ['owner', 'admin', 'viewer'] as const;
export const MAX_GROUPS_PER_USER = 10;
export const MAX_TAGS_PER_USER = 20;
export const GROUP_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'] as const;

// Turkey Dashboard
export const TURKEY_BATCH_SIZE = 15;
export const TURKEY_CHECK_TIMEOUT_MS = 5000;
export const TURKEY_DATA_RETENTION_DAYS = 90;
export const TURKEY_CATEGORIES = ['ecommerce', 'banking', 'news', 'gov', 'telecom', 'tech'] as const;
export const TURKEY_CATEGORY_LABELS: Record<string, { tr: string; en: string }> = {
  ecommerce: { tr: 'E-Ticaret', en: 'E-Commerce' },
  banking: { tr: 'Bankacılık', en: 'Banking' },
  social: { tr: 'Sosyal Medya', en: 'Social Media' },
  news: { tr: 'Haber', en: 'News' },
  gov: { tr: 'Devlet', en: 'Government' },
  telecom: { tr: 'Telekom', en: 'Telecom' },
  food: { tr: 'Yemek & Teslimat', en: 'Food & Delivery' },
  travel: { tr: 'Seyahat', en: 'Travel' },
  tech: { tr: 'Teknoloji', en: 'Technology' },
};

// Blog
export const BLOG_POSTS_PER_PAGE = 10;
export const BLOG_CATEGORIES = ['trend', 'kesinti', 'analiz', 'genel'] as const;

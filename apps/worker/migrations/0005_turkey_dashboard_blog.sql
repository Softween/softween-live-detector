-- ===== Turkey Public Dashboard =====

CREATE TABLE IF NOT EXISTS turkey_sites (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  icon_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  current_status TEXT NOT NULL DEFAULT 'unknown',
  last_response_time_ms INTEGER,
  last_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS turkey_checks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  site_id TEXT NOT NULL REFERENCES turkey_sites(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_turkey_checks_site_checked ON turkey_checks(site_id, checked_at);
CREATE INDEX idx_turkey_sites_category ON turkey_sites(category);
CREATE INDEX idx_turkey_sites_active ON turkey_sites(is_active);

CREATE TABLE IF NOT EXISTS turkey_incidents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  site_id TEXT NOT NULL REFERENCES turkey_sites(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  cause TEXT
);

CREATE INDEX idx_turkey_incidents_site ON turkey_incidents(site_id);

-- ===== Blog System =====

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_en TEXT,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  content_en TEXT,
  category TEXT NOT NULL DEFAULT 'genel',
  tags TEXT,
  cover_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  source_trend TEXT,
  related_site_ids TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status_published ON blog_posts(status, published_at);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);

CREATE TABLE IF NOT EXISTS trends_cache (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  keyword TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'TR',
  trend_data TEXT NOT NULL,
  related_queries TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_trends_cache_fetched ON trends_cache(fetched_at);

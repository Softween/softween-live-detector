-- Public Status Pages
CREATE TABLE IF NOT EXISTS status_pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT 'Status',
  description TEXT,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS status_page_monitors (
  id TEXT PRIMARY KEY,
  status_page_id TEXT NOT NULL,
  monitor_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (status_page_id) REFERENCES status_pages(id) ON DELETE CASCADE,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE,
  UNIQUE(status_page_id, monitor_id)
);

CREATE INDEX IF NOT EXISTS idx_status_pages_slug ON status_pages(slug);
CREATE INDEX IF NOT EXISTS idx_status_page_monitors_page ON status_page_monitors(status_page_id);

-- Webhook notification support
ALTER TABLE notification_settings ADD COLUMN webhook_url TEXT;
ALTER TABLE notification_settings ADD COLUMN webhook_enabled INTEGER NOT NULL DEFAULT 0;

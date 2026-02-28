-- ===== Monitor Groups =====

CREATE TABLE IF NOT EXISTS monitor_groups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#8b5cf6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_monitor_groups_user ON monitor_groups(user_id);

-- Link monitors to groups (nullable — ungrouped monitors stay as-is)
ALTER TABLE monitors ADD COLUMN group_id TEXT REFERENCES monitor_groups(id) ON DELETE SET NULL;

-- ===== Tags =====

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name);

CREATE TABLE IF NOT EXISTS monitor_tags (
  monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (monitor_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_monitor_tags_tag ON monitor_tags(tag_id);

-- ===== Status Page Enhancements =====

ALTER TABLE status_page_monitors ADD COLUMN group_id TEXT REFERENCES monitor_groups(id) ON DELETE SET NULL;
ALTER TABLE status_pages ADD COLUMN logo_url TEXT;
ALTER TABLE status_pages ADD COLUMN show_subscribe INTEGER NOT NULL DEFAULT 1;

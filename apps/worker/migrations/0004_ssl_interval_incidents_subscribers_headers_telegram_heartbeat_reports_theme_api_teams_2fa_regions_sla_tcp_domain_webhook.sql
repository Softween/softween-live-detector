-- P0-1: SSL Certificate Monitoring
ALTER TABLE monitors ADD COLUMN ssl_expiry_at TEXT;
ALTER TABLE monitors ADD COLUMN ssl_issuer TEXT;

-- P0-2: Custom Check Intervals
ALTER TABLE monitors ADD COLUMN check_interval_seconds INTEGER NOT NULL DEFAULT 300;

-- P0-3: Incident Timeline & Management
CREATE TABLE IF NOT EXISTS incident_updates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'investigating',
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_incident_updates_incident ON incident_updates(incident_id);

-- P0-4: Status Page Subscribers
CREATE TABLE IF NOT EXISTS status_page_subscribers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  status_page_id TEXT NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  confirmed INTEGER NOT NULL DEFAULT 0,
  subscribed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_subscriber_email_page ON status_page_subscribers(status_page_id, email);
CREATE INDEX idx_subscriber_token ON status_page_subscribers(token);

-- P1-5: Custom HTTP Headers
ALTER TABLE monitors ADD COLUMN custom_headers TEXT;

-- P1-6: Telegram Integration
ALTER TABLE notification_settings ADD COLUMN telegram_bot_token TEXT;
ALTER TABLE notification_settings ADD COLUMN telegram_chat_id TEXT;
ALTER TABLE notification_settings ADD COLUMN telegram_enabled INTEGER NOT NULL DEFAULT 0;

-- P1-7: Heartbeat / Cron Job Monitoring
CREATE TABLE IF NOT EXISTS heartbeat_monitors (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expected_interval_seconds INTEGER NOT NULL DEFAULT 300,
  grace_period_seconds INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_ping_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_heartbeat_user ON heartbeat_monitors(user_id);
CREATE INDEX idx_heartbeat_token ON heartbeat_monitors(token);

-- P1-8: Weekly Report Email
ALTER TABLE notification_settings ADD COLUMN weekly_report_enabled INTEGER NOT NULL DEFAULT 0;

-- P2-10: Public API & API Key
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- P2-11: Teams / Multi-user Support
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  invited_at TEXT NOT NULL DEFAULT (datetime('now')),
  joined_at TEXT
);
CREATE UNIQUE INDEX idx_team_member ON team_members(team_id, user_id);
CREATE TABLE IF NOT EXISTS team_invites (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- P2-12: 2FA (TOTP)
ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN backup_codes TEXT;

-- P2-14: Multi-Region Checks
ALTER TABLE monitors ADD COLUMN check_regions TEXT DEFAULT 'auto';
ALTER TABLE checks ADD COLUMN region TEXT;

-- P3-15: SLA Reporting
-- Uses existing data, no new tables needed

-- P3-16: Port/TCP Monitoring
ALTER TABLE monitors ADD COLUMN monitor_type TEXT NOT NULL DEFAULT 'http';
ALTER TABLE monitors ADD COLUMN port INTEGER;

-- P3-17: Domain/WHOIS Monitoring
ALTER TABLE monitors ADD COLUMN domain_expiry_at TEXT;

-- P3-18: Webhook Test & Debug
CREATE TABLE IF NOT EXISTS webhook_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error TEXT,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_webhook_logs_user ON webhook_logs(user_id);

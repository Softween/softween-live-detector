-- Migration 0003: Password reset, email verification, maintenance windows, keyword check, slow response alerts

-- Email verification flag for users (existing users default to verified)
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1;

-- Maintenance windows for monitors
ALTER TABLE monitors ADD COLUMN maintenance_start TEXT;
ALTER TABLE monitors ADD COLUMN maintenance_end TEXT;

-- Keyword check for monitors (check if response body contains this keyword)
ALTER TABLE monitors ADD COLUMN check_keyword TEXT;

-- Slow response alert settings
ALTER TABLE notification_settings ADD COLUMN slow_threshold_ms INTEGER;
ALTER TABLE notification_settings ADD COLUMN slow_alert_enabled INTEGER NOT NULL DEFAULT 0;

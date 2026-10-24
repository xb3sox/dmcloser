CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, hits integer NOT NULL DEFAULT 1, expires_at bigint NOT NULL);
CREATE INDEX IF NOT EXISTS rate_limits_expires ON rate_limits(expires_at);
INSERT INTO schema_migrations(version) VALUES(5) ON CONFLICT DO NOTHING;

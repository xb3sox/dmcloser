CREATE TABLE IF NOT EXISTS media_files (id text PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, message_id text, mime_type text NOT NULL, size_bytes integer NOT NULL, data_cipher text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_id text REFERENCES media_files(id) ON DELETE SET NULL;
INSERT INTO schema_migrations(version) VALUES(11) ON CONFLICT DO NOTHING;

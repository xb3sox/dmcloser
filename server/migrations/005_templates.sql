CREATE TABLE IF NOT EXISTS message_templates (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  locale text NOT NULL,
  status text NOT NULL CHECK (status IN ('approved', 'pending', 'rejected')),
  parameter_schema jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name, locale)
);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS template jsonb;
INSERT INTO schema_migrations(version) VALUES(5) ON CONFLICT DO NOTHING;

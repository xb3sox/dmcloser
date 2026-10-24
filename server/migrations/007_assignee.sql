ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assignee_user_id text;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_assignee_workspace_fk;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_assignee_user_id_fkey;
ALTER TABLE conversations ADD CONSTRAINT conversations_assignee_user_id_fkey FOREIGN KEY (assignee_user_id) REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS conversations_assignee ON conversations(workspace_id, assignee_user_id);


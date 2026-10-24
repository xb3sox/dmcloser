ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assignee_user_id text;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_assignee_workspace_fk;
ALTER TABLE conversations ADD CONSTRAINT conversations_assignee_workspace_fk FOREIGN KEY (workspace_id, assignee_user_id) REFERENCES members(workspace_id, user_id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS conversations_assignee ON conversations(workspace_id, assignee_user_id);

-- AI Quality Lab. The prompt a workspace runs is a versioned, owner-published
-- record and the evaluation cases and their runs are stored so a review is a
-- durable artefact rather than a one-off test.
CREATE TABLE IF NOT EXISTS ai_prompt_versions (id text PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, version integer NOT NULL, instructions text NOT NULL, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','blocked','archived')), notes text NOT NULL DEFAULT '', actor_id text, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, UNIQUE(workspace_id,version));
CREATE INDEX IF NOT EXISTS ai_prompt_versions_workspace ON ai_prompt_versions(workspace_id,status);
CREATE TABLE IF NOT EXISTS ai_eval_cases (id text PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, name text NOT NULL, kind text NOT NULL, input jsonb NOT NULL, expected jsonb NOT NULL, blocking boolean NOT NULL DEFAULT true, enabled boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS ai_eval_cases_workspace ON ai_eval_cases(workspace_id,enabled);
CREATE TABLE IF NOT EXISTS ai_eval_runs (id text PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, version_id text NOT NULL, status text NOT NULL CHECK(status IN ('running','passed','failed')), passed integer NOT NULL DEFAULT 0, failed integer NOT NULL DEFAULT 0, results jsonb NOT NULL DEFAULT '[]'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz);
CREATE INDEX IF NOT EXISTS ai_eval_runs_workspace ON ai_eval_runs(workspace_id,version_id,created_at);

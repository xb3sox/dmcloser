-- Operator flags. The rows are read on every automation decision and on
-- bootstrap. An environment variable with the same name overrides the row, so
-- an incident can force a value without a database write.
CREATE TABLE IF NOT EXISTS feature_flags (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO feature_flags(key,value) VALUES ('automation.enabled','true'::jsonb),('revenue.enabled','true'::jsonb),('pilot.workspaces','[]'::jsonb) ON CONFLICT (key) DO NOTHING;

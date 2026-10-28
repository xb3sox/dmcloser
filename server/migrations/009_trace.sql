-- Correlates an HTTP request with every job it queues. Nullable because jobs
-- can be created by a worker or a migration with no request context.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS trace_id text;

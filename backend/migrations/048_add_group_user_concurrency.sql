-- Add per-group user concurrency configuration (subscription package concurrency).
-- 0 means "use user's default concurrency" (no override).

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS user_concurrency INTEGER NOT NULL DEFAULT 0;


-- Add API key billing policy + quota controls, and make group_id required.
-- Pre-launch hardening: prevent NULL group_id from bypassing group-scoped scheduling/ACLs.

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS allow_balance BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS allow_subscription BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS quota_limit_usd DECIMAL(20,10);

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS quota_used_usd DECIMAL(20,10) NOT NULL DEFAULT 0;

-- Backfill group_id for legacy rows where it is NULL.
-- Pick the first active (non-deleted) group as a safe default.
UPDATE api_keys
SET group_id = (
  SELECT id
  FROM groups
  WHERE deleted_at IS NULL
  ORDER BY id
  LIMIT 1
)
WHERE group_id IS NULL;

ALTER TABLE api_keys
  ALTER COLUMN group_id SET NOT NULL;

-- Replace FK semantics: ON DELETE SET NULL is incompatible with group_id NOT NULL.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'api_keys'::regclass
      AND conname = 'api_keys_group_id_fkey'
  ) THEN
    ALTER TABLE api_keys DROP CONSTRAINT api_keys_group_id_fkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'api_keys'::regclass
      AND conname = 'api_keys_group_id_fkey'
  ) THEN
    ALTER TABLE api_keys
      ADD CONSTRAINT api_keys_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE RESTRICT;
  END IF;
END
$$;

-- Quota sanity checks.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'api_keys'::regclass
      AND conname = 'api_keys_quota_used_non_negative'
  ) THEN
    ALTER TABLE api_keys
      ADD CONSTRAINT api_keys_quota_used_non_negative
      CHECK (quota_used_usd >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'api_keys'::regclass
      AND conname = 'api_keys_quota_limit_non_negative'
  ) THEN
    ALTER TABLE api_keys
      ADD CONSTRAINT api_keys_quota_limit_non_negative
      CHECK (quota_limit_usd IS NULL OR quota_limit_usd >= 0);
  END IF;
END
$$;


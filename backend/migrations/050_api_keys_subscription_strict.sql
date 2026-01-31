-- Add API key strict subscription policy:
-- If enabled and the user has an active subscription for this key's group,
-- the request must use subscription quota and will never fall back to balance.

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS subscription_strict BOOLEAN NOT NULL DEFAULT FALSE;


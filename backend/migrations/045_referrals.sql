-- Add per-user invite codes + inviter relationship and referral commissions tracking.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS invite_code VARCHAR(32);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS invited_by_user_id BIGINT;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'users'::regclass
          AND conname = 'users_invited_by_user_id_fkey'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_invited_by_user_id_fkey
            FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END
$$;

-- Unique invite_code for active (non-deleted) users.
CREATE UNIQUE INDEX IF NOT EXISTS users_invite_code_unique_active
    ON users(invite_code)
    WHERE deleted_at IS NULL AND invite_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_invited_by_user_id ON users(invited_by_user_id);
CREATE INDEX IF NOT EXISTS idx_users_invited_at ON users(invited_at);

-- Referral commissions: inviter earns a rebate from invitee usage.
CREATE TABLE IF NOT EXISTS referral_commissions (
    id BIGSERIAL PRIMARY KEY,
    usage_log_id BIGINT NOT NULL REFERENCES usage_logs(id) ON DELETE CASCADE,
    inviter_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(20,10) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'referral_commissions'::regclass
          AND contype = 'u'
          AND conname = 'referral_commissions_usage_log_id_key'
    ) THEN
        ALTER TABLE referral_commissions
            ADD CONSTRAINT referral_commissions_usage_log_id_key UNIQUE (usage_log_id);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_referral_commissions_inviter_user_id ON referral_commissions(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_invitee_user_id ON referral_commissions(invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_created_at ON referral_commissions(created_at);


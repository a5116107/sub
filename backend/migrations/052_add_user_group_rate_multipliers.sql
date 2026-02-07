-- User-specific group rate multiplier overrides.
-- Allows administrators to configure per-user billing multipliers per group.
CREATE TABLE IF NOT EXISTS user_group_rate_multipliers (
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id        BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    rate_multiplier DECIMAL(10,4) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_user_group_rate_multipliers_group_id
    ON user_group_rate_multipliers(group_id);

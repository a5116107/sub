-- Migration: record billed_model for accurate pricing and analytics

ALTER TABLE usage_logs
    ADD COLUMN IF NOT EXISTS billed_model VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_usage_logs_billed_model ON usage_logs(billed_model);


-- Migration: Add payment_orders table (payment integration)
-- This table stores payment initiation, status transitions, and provider references.

CREATE TABLE IF NOT EXISTS payment_orders (
    id BIGSERIAL PRIMARY KEY,

    order_no VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id),

    provider VARCHAR(20) NOT NULL,
    channel VARCHAR(20),

    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    amount DECIMAL(20,8) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    provider_order_id VARCHAR(128),
    provider_payment_id VARCHAR(128),
    provider_checkout_id VARCHAR(128),

    provider_payload JSONB,
    description TEXT,

    paid_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_provider ON payment_orders(provider);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_created_at ON payment_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_orders_provider_order_id ON payment_orders(provider_order_id);


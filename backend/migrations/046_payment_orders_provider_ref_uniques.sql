-- Migration: Strengthen payment order provider reference uniqueness
-- Ensure provider identifiers uniquely map to a single local payment order.

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_orders_provider_order_id
    ON payment_orders(provider, provider_order_id)
    WHERE provider_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_orders_provider_checkout_id
    ON payment_orders(provider, provider_checkout_id)
    WHERE provider_checkout_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_orders_provider_payment_id
    ON payment_orders(provider, provider_payment_id)
    WHERE provider_payment_id IS NOT NULL;


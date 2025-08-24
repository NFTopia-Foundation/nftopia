-- ============================================================
-- Schema setup for nftopia_payment_service
-- This file is idempotent and safe to run multiple times
-- ============================================================

-- Create schema if not exists and assign ownership
CREATE SCHEMA IF NOT EXISTS nftopia_payment_service AUTHORIZATION nftopia;

-- Ensure the uuid-ossp and pgcrypto extensions are available
-- (needed for gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- Idempotency table
-- ============================================================

CREATE TABLE IF NOT EXISTS nftopia_payment_service.idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- Transaction table
-- ============================================================
CREATE TABLE IF NOT EXISTS nftopia_payment_service.transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    nft_id UUID NOT NULL,
    auction_id UUID NOT NULL,

    amount NUMERIC(36, 18) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_hash VARCHAR(100) NOT NULL UNIQUE,

    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',

    escrow_details JSONB,
    royalty_split JSONB,
    fraud_metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    idempotency_key VARCHAR(64) NOT NULL,
    CONSTRAINT uk_transaction_idempotency_key UNIQUE (idempotency_key)
);


-- ============================================================
-- Indexes (matching @Table(indexes=...))
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transaction_status
    ON nftopia_payment_service.transaction (status);

CREATE INDEX IF NOT EXISTS idx_transaction_nft_id
    ON nftopia_payment_service.transaction (nft_id);

CREATE INDEX IF NOT EXISTS idx_transaction_created_at
    ON nftopia_payment_service.transaction (created_at);

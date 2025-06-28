-- Initialize TimescaleDB Extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create analytics database
CREATE DATABASE nftopia_analytics_test;

-- Connect to the analytics database
\c nftopia_analytics;

-- Enable TimescaleDB extension in the main database
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create index for improved query performance
CREATE INDEX IF NOT EXISTS idx_block_number ON public.marketplace_nftmint (block_number);
CREATE INDEX IF NOT EXISTS idx_contract_collection ON public.marketplace_nftmint (contract_address, collection_id);

-- Note: Hypertables will be created by Django management commands
-- This script only sets up the basic database structure 
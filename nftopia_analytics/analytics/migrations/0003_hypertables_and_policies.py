from django.db import migrations

SQL = """
SET search_path TO nftopia_analytics, public;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN

    -- Create hypertables (idempotent)
    PERFORM create_hypertable('nft_mints', 'occurred_at', if_not_exists => TRUE, migrate_data => TRUE);
    PERFORM create_hypertable('nft_sales', 'occurred_at', if_not_exists => TRUE, migrate_data => TRUE);
    PERFORM create_hypertable('nft_transfers', 'occurred_at', if_not_exists => TRUE, migrate_data => TRUE);

    -- Set chunk interval (adjust if your ingestion rate is much higher or lower)
    BEGIN
      PERFORM set_chunk_time_interval('nft_mints', INTERVAL '1 day');
      PERFORM set_chunk_time_interval('nft_sales', INTERVAL '1 day');
      PERFORM set_chunk_time_interval('nft_transfers', INTERVAL '1 day');
    EXCEPTION WHEN undefined_function THEN NULL; END;

    -- Enable compression & add compression policy (older than 7 days)
    BEGIN
      ALTER TABLE nft_mints SET (timescaledb.compress, timescaledb.compress_orderby = 'occurred_at DESC');
      PERFORM add_compression_policy('nft_mints', INTERVAL '7 days');
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'nft_mints compression skipped: %', SQLERRM; END;

    BEGIN
      ALTER TABLE nft_sales SET (timescaledb.compress, timescaledb.compress_orderby = 'occurred_at DESC');
      PERFORM add_compression_policy('nft_sales', INTERVAL '7 days');
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'nft_sales compression skipped: %', SQLERRM; END;

    BEGIN
      ALTER TABLE nft_transfers SET (timescaledb.compress, timescaledb.compress_orderby = 'occurred_at DESC');
      PERFORM add_compression_policy('nft_transfers', INTERVAL '7 days');
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'nft_transfers compression skipped: %', SQLERRM; END;

    -- Add retention for raw events (90 days)
    BEGIN
      PERFORM add_retention_policy('nft_mints', INTERVAL '90 days');
      PERFORM add_retention_policy('nft_sales', INTERVAL '90 days');
      PERFORM add_retention_policy('nft_transfers', INTERVAL '90 days');
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'retention policies setup skipped: %', SQLERRM; END;

    -- Continuous aggregates for sales (1h & 1d) - optional but requested
    BEGIN
      EXECUTE $$ 
        CREATE MATERIALIZED VIEW IF NOT EXISTS nft_sales_1h
        WITH (timescaledb.continuous) AS
        SELECT time_bucket('1 hour', occurred_at) AS bucket, COUNT(*) AS tx_count, SUM(amount) AS volume
        FROM nft_sales
        GROUP BY bucket
        WITH NO DATA;
      $$;
      PERFORM add_continuous_aggregate_policy('nft_sales_1h', start_offset => INTERVAL '90 days', end_offset => INTERVAL '1 hour', schedule_interval => INTERVAL '15 minutes');
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'cagg nft_sales_1h skipped: %', SQLERRM; END;

    BEGIN
      EXECUTE $$
        CREATE MATERIALIZED VIEW IF NOT EXISTS nft_sales_1d
        WITH (timescaledb.continuous) AS
        SELECT time_bucket('1 day', occurred_at) AS bucket, COUNT(*) AS tx_count, SUM(amount) AS volume
        FROM nft_sales
        GROUP BY bucket
        WITH NO DATA;
      $$;
      PERFORM add_continuous_aggregate_policy('nft_sales_1d', start_offset => INTERVAL '1 year', end_offset => INTERVAL '1 day', schedule_interval => INTERVAL '1 hour');
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'cagg nft_sales_1d skipped: %', SQLERRM; END;

  ELSE
    RAISE NOTICE 'TimescaleDB extension not found; hypertable & policy creation skipped.';
  END IF;
END$$;
"""

REVERSE = """
-- reverse intentionally left blank to avoid accidental data loss
"""

class Migration(migrations.Migration):
    dependencies = [
        ('analytics', '0002_initial')  # REPLACE '0002_auto' with actual auto migration filename created by makemigrations
    ]
    operations = [migrations.RunSQL(SQL, reverse_sql=REVERSE)]

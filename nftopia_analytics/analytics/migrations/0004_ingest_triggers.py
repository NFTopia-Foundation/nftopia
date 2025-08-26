from django.db import migrations

SQL = """
DO $$
BEGIN
  -- Create schema if not exists (safe)
  CREATE SCHEMA IF NOT EXISTS nftopia_analytics;

  -- Function: ingest transaction -> nft_sales & nft_transfers
  CREATE OR REPLACE FUNCTION nftopia_analytics.fn_ingest_sale_or_transfer()
  RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    -- Only act for rows marked 'completed' (adjust per your state model)
    IF (TG_OP = 'INSERT' AND COALESCE(NEW.status::text, '') = 'completed')
       OR (TG_OP = 'UPDATE' AND COALESCE(NEW.status::text, '') = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status))
    THEN
      INSERT INTO nftopia_analytics.nft_sales (
         nft_id, buyer_user_id, seller_user_id, amount, currency, tx_hash, status, occurred_at, created_at
      ) VALUES (
         NEW.nftId, NEW.buyerId, NEW.sellerId, COALESCE(NEW.amount,0), COALESCE(NEW.currency::text,'STK'), COALESCE(NEW.transactionHash::text,''), COALESCE(NEW.status::text,''), COALESCE(NEW.timestamp, now()), now()
      );
    END IF;

    IF COALESCE(NEW.status::text,'') = 'completed' AND NEW.buyerId IS NOT NULL AND NEW.sellerId IS NOT NULL AND NEW.buyerId <> NEW.sellerId THEN
      INSERT INTO nftopia_analytics.nft_transfers (
         nft_id, from_user_id, to_user_id, tx_hash, occurred_at, created_at
      ) VALUES (
         NEW.nftId, NEW.sellerId, NEW.buyerId, COALESCE(NEW.transactionHash::text,''), COALESCE(NEW.timestamp, now()), now()
      );
    END IF;

    RETURN NEW;
  END;
  $$;

  -- Function: ingest nft -> nft_mints
  CREATE OR REPLACE FUNCTION nftopia_analytics.fn_ingest_mint()
  RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    INSERT INTO nftopia_analytics.nft_mints (
      nft_id, owner_user_id, token_id, tx_hash, occurred_at, created_at
    ) VALUES (
      NEW.id, NEW.ownerId, COALESCE(NEW.tokenId::text,''), COALESCE(NEW.transactionHash::text, COALESCE(NEW.tx_hash::text,'')), COALESCE(NEW.createdAt, now()), now()
    );
    RETURN NEW;
  END;
  $$;

  -- Create triggers (drop if existent)
  DROP TRIGGER IF EXISTS trg_ingest_sale_or_transfer_ins ON public.transaction;
  DROP TRIGGER IF EXISTS trg_ingest_sale_or_transfer_upd ON public.transaction;
  DROP TRIGGER IF EXISTS trg_ingest_mint ON public.nft;

  CREATE TRIGGER trg_ingest_sale_or_transfer_ins
    AFTER INSERT ON public.transaction
    FOR EACH ROW EXECUTE FUNCTION nftopia_analytics.fn_ingest_sale_or_transfer();

  CREATE TRIGGER trg_ingest_sale_or_transfer_upd
    AFTER UPDATE OF status ON public.transaction
    FOR EACH ROW EXECUTE FUNCTION nftopia_analytics.fn_ingest_sale_or_transfer();

  CREATE TRIGGER trg_ingest_mint
    AFTER INSERT ON public.nft
    FOR EACH ROW EXECUTE FUNCTION nftopia_analytics.fn_ingest_mint();

END$$;
"""

REVERSE = """
DROP TRIGGER IF EXISTS trg_ingest_sale_or_transfer_ins ON public.transaction;
DROP TRIGGER IF EXISTS trg_ingest_sale_or_transfer_upd ON public.transaction;
DROP FUNCTION IF EXISTS nftopia_analytics.fn_ingest_sale_or_transfer();

DROP TRIGGER IF EXISTS trg_ingest_mint ON public.nft;
DROP FUNCTION IF EXISTS nftopia_analytics.fn_ingest_mint();
"""

class Migration(migrations.Migration):
    dependencies = [
        ('analytics', '0003_hypertables_and_policies')  # adjust name if different
    ]
    operations = [migrations.RunSQL(SQL, reverse_sql=REVERSE)]

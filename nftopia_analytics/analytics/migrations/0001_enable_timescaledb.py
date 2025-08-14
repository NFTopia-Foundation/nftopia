from django.db import migrations

SQL = """
-- Enable Timescale extension (no-op if already present) and create analytics schema.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    CREATE EXTENSION IF NOT EXISTS timescaledb;
  END IF;
  PERFORM 1;
END$$;

CREATE SCHEMA IF NOT EXISTS nftopia_analytics AUTHORIZATION CURRENT_USER;
"""

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.RunSQL(SQL, reverse_sql="DROP SCHEMA IF EXISTS nftopia_analytics CASCADE;")
    ]

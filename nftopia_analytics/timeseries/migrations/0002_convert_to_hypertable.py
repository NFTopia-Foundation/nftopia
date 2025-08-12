from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('transactions', '0001_initial'),  # Depends on your transactions app
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                """
                CREATE EXTENSION IF NOT EXISTS timescaledb;
                SELECT create_hypertable(
                    'transaction', 
                    'timestamp',
                    chunk_time_interval => INTERVAL '1 week',
                    if_not_exists => TRUE
                );
                ALTER TABLE transaction SET (
                    timescaledb.compress,
                    timescaledb.compress_orderby = 'timestamp DESC',
                    timescaledb.compress_segmentby = 'status,nft_id'
                );
                SELECT add_compression_policy('transaction', INTERVAL '7 days');
                """
            ],
            reverse_sql=[
                """
                SELECT remove_compression_policy('transaction');
                ALTER TABLE transaction SET WITHOUT timescaledb.compress;
                SELECT remove_hypertable('transaction');
                """
            ]
        )
    ]
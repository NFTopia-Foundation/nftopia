from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Initialize TimescaleDB hypertables and policies'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            self.stdout.write("Setting up TimescaleDB...")
            
            # 1. Enable TimescaleDB extension
            cursor.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")
            
            # 2. Convert tables to hypertables
            self.create_hypertables(cursor)
            
            # 3. Set up retention policies
            self.setup_retention_policies(cursor)
            
            # 4. Configure compression
            self.setup_compression(cursor)
            
            self.stdout.write(self.style.SUCCESS("TimescaleDB setup complete!"))

    def create_hypertables(self, cursor):
        hypertables = [
            ('nft_mints', 'mint_time', '7 days'),
            ('nft_sales', 'sale_time', '1 day'),
            ('nft_transfers', 'transfer_time', '3 days'),
        ]
        
        for table, time_column, interval in hypertables:
            try:
                cursor.execute(f"""
                    SELECT create_hypertable(
                        'nftopia_analytics.{table}',
                        '{time_column}',
                        chunk_time_interval => INTERVAL '{interval}',
                        if_not_exists => TRUE
                    );
                """)
                self.stdout.write(f"Created hypertable for {table}")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Couldn't create hypertable for {table}: {e}"))

    def setup_retention_policies(self, cursor):
        retention_periods = [
            ('nft_mints', '180 days'),
            ('nft_sales', '90 days'),
            ('nft_transfers', '60 days'),
        ]
        
        for table, period in retention_periods:
            try:
                cursor.execute(f"""
                    SELECT add_retention_policy('nftopia_analytics.{table}', INTERVAL '{period}');
                """)
                self.stdout.write(f"Set {period} retention for {table}")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Couldn't set retention for {table}: {e}"))

    def setup_compression(self, cursor):
        compress_configs = [
            ('nft_mints', 'mint_time', 'collection_id'),
            ('nft_sales', 'sale_time', 'nft_id'),
        ]
        
        for table, time_column, segment_column in compress_configs:
            try:
                cursor.execute(f"""
                    ALTER TABLE nftopia_analytics.{table} SET (
                        timescaledb.compress,
                        timescaledb.compress_orderby = '{time_column} DESC',
                        timescaledb.compress_segmentby = '{segment_column}'
                    );
                    SELECT add_compression_policy('nftopia_analytics.{table}', INTERVAL '30 days');
                """)
                self.stdout.write(f"Enabled compression for {table}")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Couldn't enable compression for {table}: {e}"))
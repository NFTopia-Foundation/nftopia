# analytics/timeseries.py
from django.db import connection

def setup_hypertables():
    with connection.cursor() as cursor:
        # Convert payment_service.transactions
        cursor.execute("""
            SELECT create_hypertable(
                'payment_service.transactions',
                'timestamp',
                chunk_time_interval => INTERVAL '1 week'
            );
            
            -- Create analytics schema for materialized views
            CREATE SCHEMA IF NOT EXISTS analytics;
            
            -- Daily volume aggregates
            CREATE MATERIALIZED VIEW analytics.daily_volume AS
            SELECT 
                time_bucket('1 day', timestamp) AS day,
                nft_id,
                SUM(amount) AS volume
            FROM payment_service.transactions
            GROUP BY day, nft_id;
        """)
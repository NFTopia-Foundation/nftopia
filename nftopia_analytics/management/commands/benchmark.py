from django.core.management.base import BaseCommand
from analytics.models import NFTEvent
import time
import pandas as pd

class Command(BaseCommand):
    help = 'Benchmark Pandas vs raw SQL performance'
    
    def handle(self, *args, **options):
        # Test dataset
        test_filters = {
            'timestamp__gte': '2023-01-01',
            'event_type': 'SALE'
        }
        
        # Pandas benchmark
        start = time.time()
        df = NFTEvent.to_dataframe(**test_filters)
        agg = df.groupby(pd.Grouper(key='timestamp', freq='D')).sum()
        pandas_time = time.time() - start
        
        # SQL benchmark
        start = time.time()
        from django.db import connection
        with connection.cursor() as c:
            c.execute("""
                SELECT DATE(timestamp), SUM(amount)
                FROM analytics_nftevent
                WHERE timestamp >= '2023-01-01' AND event_type = 'SALE'
                GROUP BY DATE(timestamp)
            """)
            sql_results = c.fetchall()
        sql_time = time.time() - start
        
        print(f"Pandas: {pandas_time:.4f}s | SQL: {sql_time:.4f}s")
        print(f"Speedup: {sql_time/pandas_time:.1f}x")
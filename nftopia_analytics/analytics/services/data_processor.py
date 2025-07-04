import pandas as pd
from django.core.cache import cache
from django.db import connection
from datetime import datetime, timedelta

class DataProcessor:
    @staticmethod
    def get_minting_trends(timeframe='7d'):
        cache_key = f"viz-raw:{timeframe}:minting"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return cached_data

        # Determine time range
        if timeframe == '24h':
            delta = timedelta(hours=24)
        elif timeframe == '7d':
            delta = timedelta(days=7)
        else:  # 30d
            delta = timedelta(days=30)

        end_date = datetime.now()
        start_date = end_date - delta

        # Raw SQL query (adjust based on your models)
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT DATE(created_at) as date, 
                       COUNT(*) as count 
                FROM minting_nft 
                WHERE created_at BETWEEN %s AND %s 
                GROUP BY DATE(created_at)
                """, [start_date, end_date])
            rows = cursor.fetchall()

        df = pd.DataFrame(rows, columns=['date', 'count'])
        df['rolling_avg'] = df['count'].rolling(window=3).mean()
        
        # Cache results
        cache.set(cache_key, df, timeout=3600)
        return df
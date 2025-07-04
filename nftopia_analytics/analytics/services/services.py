import psutil
from datetime import datetime, timedelta
from django.db.models import Count
from ..models import MintEvent, SaleEvent, UserActivity
import csv
import json
from io import StringIO
from django.http import HttpResponse

class ExportService:
    @staticmethod
    def export_response(data, format):
        if format == 'csv':
            response = HttpResponse(content_type='text/csv')
            writer = csv.writer(response)
            writer.writerow(['Date', 'Mints', 'Sales'])
            for row in data:
                writer.writerow([row['date'], row['mints'], row['sales']])
            return response
        else:
            return JsonResponse(data)

class AnalyticsService:
    @staticmethod
    def get_mint_metrics(timeframe='7d'):
        date_threshold = datetime.now() - timedelta(days=int(timeframe[:-1]))
        data = MintEvent.objects.filter(
            created_at__gte=date_threshold
        ).values('created_at__date').annotate(
            count=Count('id')
        ).order_by('created_at__date')
        return {
            'labels': [d['created_at__date'].strftime('%Y-%m-%d') for d in data],
            'data': [d['count'] for d in data]
        }

    @staticmethod
    def get_user_activity():
        # Returns data for heatmap
        return UserActivity.objects.get_heatmap_data()

    @staticmethod
    def get_system_health():
        return {
            'cpu': psutil.cpu_percent(),
            'memory': psutil.virtual_memory().percent,
            'uptime': str(datetime.now() - datetime.fromtimestamp(psutil.boot_time()))
        }
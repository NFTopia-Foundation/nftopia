from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import GasMetrics
from .serializers import GasMetricsSerializer
from django.utils import timezone
from datetime import timedelta
from django.http import HttpResponse
import csv
from django.db.models import Avg, Min, Max
import requests
from apps.cache.redis_utils import check_redis_health  # Add this import

# Utility to fetch live ETH price from CoinGecko
def get_live_eth_price():
    try:
        response = requests.get(
            'https://api.coingecko.com/api/v3/simple/price',
            params={'ids': 'ethereum', 'vs_currencies': 'usd'},
            timeout=5
        )
        data = response.json()
        return float(data['ethereum']['usd'])
    except Exception:
        return 3500  # fallback to default if API fails

def calculate_metrics(qs, eth_price_usd=None):
    if eth_price_usd is None:
        eth_price_usd = get_live_eth_price()
    avg_gas_price = qs.aggregate(avg=Avg('gas_price'))['avg'] or 0
    min_gas_price = qs.aggregate(min=Min('gas_price'))['min'] or 0
    max_gas_price = qs.aggregate(max=Max('gas_price'))['max'] or 0
    total_gas_used = qs.aggregate(total=Avg('gas_used'))['total'] or 0
    # Convert gas price (gwei) to ETH, then to USD
    avg_gas_price_eth = avg_gas_price * 1e-9
    avg_cost_usd = avg_gas_price_eth * eth_price_usd
    return {
        'average_gas_price_gwei': avg_gas_price,
        'min_gas_price_gwei': min_gas_price,
        'max_gas_price_gwei': max_gas_price,
        'average_cost_usd': avg_cost_usd,
        'eth_price_usd': eth_price_usd,
    }

def health_check(request):
    """Health check endpoint with Redis status"""
    # Add cache health to existing health check
    cache_status = check_redis_health()
    
    # Return response including Redis status
    return Response({
        'status': 'ok',
        'services': {
            'database': 'ok',  # Assuming DB is always ok if we got here
            'redis': 'ok' if cache_status else 'unavailable',
            'coingecko_api': 'ok' if get_live_eth_price() != 3500 else 'unavailable'
        }
    })

# Create your views here.
class GasMintingView(APIView):
    def get(self, request):
        days = int(request.GET.get('days', 7))
        collection_id = request.GET.get('collection_id')
        format_type = request.GET.get('format')
        since = timezone.now() - timedelta(days=days)
        qs = GasMetrics.objects.filter(transaction_type='MINT', timestamp__gte=since)
        if collection_id:
            qs = qs.filter(collection_id=collection_id)
        qs = qs.order_by('-timestamp')
        eth_price_usd = get_live_eth_price()
        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="gas_minting.csv"'
            writer = csv.writer(response)
            writer.writerow(['id', 'transaction_type', 'gas_used', 'gas_price', 'timestamp', 'collection_id'])
            for gm in qs:
                writer.writerow([gm.id, gm.transaction_type, gm.gas_used, gm.gas_price, gm.timestamp, gm.collection_id])
            return response
        serializer = GasMetricsSerializer(qs, many=True)
        metrics = calculate_metrics(qs, eth_price_usd)
        return Response({'metrics': metrics, 'results': serializer.data})

class GasSalesView(APIView):
    def get(self, request):
        days = int(request.GET.get('days', 7))
        collection_id = request.GET.get('collection_id')
        format_type = request.GET.get('format')
        since = timezone.now() - timedelta(days=days)
        qs = GasMetrics.objects.filter(transaction_type__in=['SALE_DIRECT', 'SALE_AUCTION'], timestamp__gte=since)
        if collection_id:
            qs = qs.filter(collection_id=collection_id)
        qs = qs.order_by('-timestamp')
        eth_price_usd = get_live_eth_price()
        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="gas_sales.csv"'
            writer = csv.writer(response)
            writer.writerow(['id', 'transaction_type', 'gas_used', 'gas_price', 'timestamp', 'collection_id'])
            for gm in qs:
                writer.writerow([gm.id, gm.transaction_type, gm.gas_used, gm.gas_price, gm.timestamp, gm.collection_id])
            return response
        serializer = GasMetricsSerializer(qs, many=True)
        metrics = calculate_metrics(qs, eth_price_usd)
        return Response({'metrics': metrics, 'results': serializer.data})

class GasPredictionsView(APIView):
    def get(self, request):
        days = int(request.GET.get('days', 30))
        collection_id = request.GET.get('collection_id')
        since = timezone.now() - timedelta(days=days)
        qs = GasMetrics.objects.filter(timestamp__gte=since)
        if collection_id:
            qs = qs.filter(collection_id=collection_id)
        qs = qs.order_by('timestamp')
        # Simple prediction: linear regression on gas_price
        import numpy as np
        from sklearn.linear_model import LinearRegression
        import pandas as pd
        if qs.count() < 2:
            return Response({"error": "Not enough data for prediction"}, status=400)
        df = pd.DataFrame(list(qs.values('timestamp', 'gas_price')))
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp')
        df['timestamp_ordinal'] = df['timestamp'].map(pd.Timestamp.toordinal)
        X = df['timestamp_ordinal'].values.reshape(-1, 1)
        y = df['gas_price'].values
        model = LinearRegression().fit(X, y)
        # Predict for next 7 days
        last_day = df['timestamp'].max()
        future_days = [last_day + pd.Timedelta(days=i) for i in range(1, 8)]
        future_ordinals = np.array([d.toordinal() for d in future_days]).reshape(-1, 1)
        predicted_gas_prices = model.predict(future_ordinals)
        eth_price_usd = get_live_eth_price()
        predicted_costs_usd = [float(gp) * 1e-9 * eth_price_usd for gp in predicted_gas_prices]
        predictions = [
            {
                'date': str(future_days[i].date()),
                'predicted_gas_price_gwei': float(predicted_gas_prices[i]),
                'predicted_cost_usd': predicted_costs_usd[i],
            }
            for i in range(7)
        ]
        return Response({'predictions': predictions, 'eth_price_usd': eth_price_usd})
    
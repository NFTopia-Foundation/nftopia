from django.shortcuts import render
from django.http import JsonResponse
from django.db.models import Count, Sum, Avg, Min, Max, Q
from django.db.models.functions import TruncDate, TruncHour, TruncMonth
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import logging
from .models import SalesEvent, SalesAggregate

logger = logging.getLogger(__name__)

def sales_analytics(request):
    """
    Main analytics endpoint for sales data
    This will be cached with @cache_response decorator
    """
    try:
        # Get query parameters with defaults
        days = int(request.GET.get('days', 7))
        contract_address = request.GET.get('contract_address')
        marketplace = request.GET.get('marketplace')
        min_price = request.GET.get('min_price')
        max_price = request.GET.get('max_price')
        
        # Calculate date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Base queryset
        queryset = SalesEvent.objects.filter(timestamp__gte=start_date)
        
        # Apply filters
        if contract_address:
            queryset = queryset.filter(contract_address=contract_address)
        
        if marketplace:
            queryset = queryset.filter(marketplace=marketplace)
        
        if min_price:
            queryset = queryset.filter(sale_price__gte=Decimal(min_price))
        
        if max_price:
            queryset = queryset.filter(sale_price__lte=Decimal(max_price))
        
        # Aggregate data
        total_sales = queryset.count()
        unique_buyers = queryset.values('buyer_address').distinct().count()
        unique_sellers = queryset.values('seller_address').distinct().count()
        
        # Volume and price aggregates
        volume_data = queryset.aggregate(
            total_volume=Sum('sale_price'),
            avg_price=Avg('sale_price'),
            min_price=Min('sale_price'),
            max_price=Max('sale_price'),
            total_fees=Sum('marketplace_fee') + Sum('royalty_fee')
        )
        
        # Handle None values
        total_volume = float(volume_data['total_volume'] or 0)
        avg_price = float(volume_data['avg_price'] or 0)
        min_price = float(volume_data['min_price'] or 0)
        max_price = float(volume_data['max_price'] or 0)
        total_fees = float(volume_data['total_fees'] or 0)
        
        # Daily sales trends
        daily_sales = list(queryset.annotate(
            date=TruncDate('timestamp')
        ).values('date').annotate(
            sales_count=Count('id'),
            volume=Sum('sale_price'),
            avg_price=Avg('sale_price'),
            unique_buyers=Count('buyer_address', distinct=True),
            unique_sellers=Count('seller_address', distinct=True)
        ).order_by('date'))
        
        # Convert Decimal to float for JSON serialization
        for item in daily_sales:
            item['volume'] = float(item['volume'] or 0)
            item['avg_price'] = float(item['avg_price'] or 0)
        
        # Hourly sales trends (last 24 hours)
        yesterday = timezone.now() - timedelta(hours=24)
        hourly_sales = list(queryset.filter(
            timestamp__gte=yesterday
        ).annotate(
            hour=TruncHour('timestamp')
        ).values('hour').annotate(
            sales_count=Count('id'),
            volume=Sum('sale_price')
        ).order_by('hour'))
        
        # Convert Decimal to float
        for item in hourly_sales:
            item['volume'] = float(item['volume'] or 0)
        
        # Top collections by volume
        top_collections = list(queryset.values('contract_address').annotate(
            sales_count=Count('id'),
            total_volume=Sum('sale_price'),
            avg_price=Avg('sale_price'),
            unique_buyers=Count('buyer_address', distinct=True)
        ).order_by('-total_volume')[:10])
        
        # Convert Decimal to float
        for item in top_collections:
            item['total_volume'] = float(item['total_volume'] or 0)
            item['avg_price'] = float(item['avg_price'] or 0)
        
        # Marketplace breakdown
        marketplace_stats = list(queryset.values('marketplace').annotate(
            sales_count=Count('id'),
            total_volume=Sum('sale_price'),
            avg_price=Avg('sale_price')
        ).order_by('-total_volume'))
        
        # Convert Decimal to float
        for item in marketplace_stats:
            item['total_volume'] = float(item['total_volume'] or 0)
            item['avg_price'] = float(item['avg_price'] or 0)
        
        # Response data
        data = {
            'period': f'{days} days',
            'summary': {
                'total_sales': total_sales,
                'unique_buyers': unique_buyers,
                'unique_sellers': unique_sellers,
                'total_volume': total_volume,
                'average_price': avg_price,
                'min_price': min_price,
                'max_price': max_price,
                'total_fees': total_fees,
            },
            'trends': {
                'daily_sales': daily_sales,
                'hourly_sales': hourly_sales,
            },
            'top_collections': top_collections,
            'marketplace_stats': marketplace_stats,
            'filters': {
                'days': days,
                'contract_address': contract_address,
                'marketplace': marketplace,
                'min_price': min_price,
                'max_price': max_price,
            }
        }
        
        return JsonResponse(data)
    
    except Exception as e:
        logger.error(f"Error in sales_analytics: {str(e)}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

def sales_leaderboard(request):
    """
    Leaderboard endpoint for top sellers and buyers
    This will also be cached
    """
    try:
        days = int(request.GET.get('days', 30))
        limit = int(request.GET.get('limit', 50))
        leaderboard_type = request.GET.get('type', 'sellers')  # 'sellers' or 'buyers'
        
        # Calculate date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        queryset = SalesEvent.objects.filter(timestamp__gte=start_date)
        
        if leaderboard_type == 'sellers':
            # Top sellers
            leaderboard = list(queryset.values('seller_address').annotate(
                sales_count=Count('id'),
                total_volume=Sum('sale_price'),
                avg_price=Avg('sale_price'),
                unique_buyers=Count('buyer_address', distinct=True)
            ).order_by('-total_volume')[:limit])
        else:
            # Top buyers
            leaderboard = list(queryset.values('buyer_address').annotate(
                purchases_count=Count('id'),
                total_spent=Sum('sale_price'),
                avg_price=Avg('sale_price'),
                unique_sellers=Count('seller_address', distinct=True)
            ).order_by('-total_spent')[:limit])
        
        # Convert Decimal to float
        for item in leaderboard:
            for key, value in item.items():
                if isinstance(value, Decimal):
                    item[key] = float(value)
        
        return JsonResponse({
            'leaderboard': leaderboard,
            'type': leaderboard_type,
            'period': f'{days} days',
            'limit': limit
        })
    
    except Exception as e:
        logger.error(f"Error in sales_leaderboard: {str(e)}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

def sales_collection_stats(request):
    """
    Collection-specific sales statistics
    This will be cached
    """
    try:
        contract_address = request.GET.get('contract_address')
        if not contract_address:
            return JsonResponse({'error': 'contract_address is required'}, status=400)
        
        days = int(request.GET.get('days', 30))
        
        # Calculate date range
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Collection sales data
        queryset = SalesEvent.objects.filter(
            contract_address=contract_address,
            timestamp__gte=start_date
        )
        
        # Basic stats
        total_sales = queryset.count()
        unique_tokens = queryset.values('token_id').distinct().count()
        
        # Volume and price stats
        volume_data = queryset.aggregate(
            total_volume=Sum('sale_price'),
            avg_price=Avg('sale_price'),
            min_price=Min('sale_price'),
            max_price=Max('sale_price'),
            floor_price=Min('sale_price')  # Simplified floor price
        )
        
        # Price distribution
        price_ranges = [
            {'min': 0, 'max': 0.1, 'count': 0},
            {'min': 0.1, 'max': 1, 'count': 0},
            {'min': 1, 'max': 10, 'count': 0},
            {'min': 10, 'max': 100, 'count': 0},
            {'min': 100, 'max': float('inf'), 'count': 0}
        ]
        
        for range_item in price_ranges:
            if range_item['max'] == float('inf'):
                count = queryset.filter(sale_price__gte=range_item['min']).count()
            else:
                count = queryset.filter(
                    sale_price__gte=range_item['min'],
                    sale_price__lt=range_item['max']
                ).count()
            range_item['count'] = count
        
        # Recent sales
        recent_sales = list(queryset.order_by('-timestamp')[:10].values(
            'token_id', 'sale_price', 'buyer_address', 'seller_address', 
            'timestamp', 'marketplace'
        ))
        
        # Convert Decimal to float
        for sale in recent_sales:
            sale['sale_price'] = float(sale['sale_price'])
        
        # Convert volume data
        for key, value in volume_data.items():
            if isinstance(value, Decimal):
                volume_data[key] = float(value)
        
        data = {
            'contract_address': contract_address,
            'period': f'{days} days',
            'summary': {
                'total_sales': total_sales,
                'unique_tokens_sold': unique_tokens,
                **volume_data
            },
            'price_distribution': price_ranges,
            'recent_sales': recent_sales
        }
        
        return JsonResponse(data)
    
    except Exception as e:
        logger.error(f"Error in sales_collection_stats: {str(e)}")
        return JsonResponse({'error': 'Internal server error'}, status=500)

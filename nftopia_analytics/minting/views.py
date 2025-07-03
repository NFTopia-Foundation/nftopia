from django.shortcuts import render
from django.http import JsonResponse
from django.db.models import Count, Sum, Avg
from django.db.models.functions import TruncDate, TruncHour
from django.utils import timezone
from datetime import timedelta
from .models import MintingEvent

def minting_analytics(request):
    """
    Main analytics endpoint for minting data
    This will be cached with @cache_response decorator
    """
    # Get query parameters
    days = int(request.GET.get('days', 7))
    contract_address = request.GET.get('contract_address')
    
    # Calculate date range
    end_date = timezone.now()
    start_date = end_date - timedelta(days=days)
    
    # Base queryset
    queryset = MintingEvent.objects.filter(timestamp__gte=start_date)
    
    # Filter by contract if provided
    if contract_address:
        queryset = queryset.filter(contract_address=contract_address)
    
    # Aggregate data
    total_mints = queryset.count()
    unique_minters = queryset.values('minter_address').distinct().count()
    total_mint_value = queryset.aggregate(total=Sum('mint_price'))['total'] or 0
    avg_mint_price = queryset.aggregate(avg=Avg('mint_price'))['avg'] or 0
    
    # Daily minting trends
    daily_mints = list(queryset.annotate(
        date=TruncDate('timestamp')
    ).values('date').annotate(
        count=Count('id'),
        volume=Sum('mint_price')
    ).order_by('date'))
    
    # Hourly minting trends (last 24 hours)
    yesterday = timezone.now() - timedelta(hours=24)
    hourly_mints = list(queryset.filter(
        timestamp__gte=yesterday
    ).annotate(
        hour=TruncHour('timestamp')
    ).values('hour').annotate(
        count=Count('id')
    ).order_by('hour'))
    
    # Top contracts by minting volume
    top_contracts = list(queryset.values('contract_address').annotate(
        mint_count=Count('id'),
        total_volume=Sum('mint_price')
    ).order_by('-mint_count')[:10])
    
    # Response data
    data = {
        'period': f'{days} days',
        'summary': {
            'total_mints': total_mints,
            'unique_minters': unique_minters,
            'total_mint_value': float(total_mint_value),
            'average_mint_price': float(avg_mint_price),
        },
        'trends': {
            'daily_mints': daily_mints,
            'hourly_mints': hourly_mints,
        },
        'top_contracts': top_contracts,
        'filters': {
            'days': days,
            'contract_address': contract_address,
        }
    }
    
    return JsonResponse(data)

def minting_leaderboard(request):
    """
    Leaderboard endpoint for top minters
    This will also be cached
    """
    days = int(request.GET.get('days', 30))
    limit = int(request.GET.get('limit', 50))
    
    # Calculate date range
    end_date = timezone.now()
    start_date = end_date - timedelta(days=days)
    
    # Get top minters
    top_minters = list(MintingEvent.objects.filter(
        timestamp__gte=start_date
    ).values('minter_address').annotate(
        mint_count=Count('id'),
        total_spent=Sum('mint_price')
    ).order_by('-mint_count')[:limit])
    
    return JsonResponse({
        'leaderboard': top_minters,
        'period': f'{days} days',
        'limit': limit
    })

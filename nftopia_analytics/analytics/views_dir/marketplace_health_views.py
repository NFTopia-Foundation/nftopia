from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.db.models import Q
from datetime import datetime, timedelta
from django.utils import timezone

from ..models_dir.marketplace_health import (
    LiquidityMetrics,
    TradingActivityMetrics,
    UserEngagementMetrics,
    MarketplaceHealthSnapshot,
    CollectionWatchlist
)
from ..serializers_dir.marketplace_health_serializers import (
    LiquidityMetricsSerializer,
    TradingActivityMetricsSerializer,
    UserEngagementMetricsSerializer,
    MarketplaceHealthSnapshotSerializer,
    CollectionWatchlistSerializer
)
from ..services.marketplace_health_service import MarketplaceHealthService
from marketplace.models import Collection


class MarketplaceHealthDashboardView(generics.GenericAPIView):
    """
    GET: Returns comprehensive marketplace health dashboard data
    """
    permission_classes = [IsAuthenticated]
    
    @method_decorator(cache_page(60))  # Cache for 1 minute
    def get(self, request):
        # Get latest health snapshot
        latest_snapshot = MarketplaceHealthSnapshot.objects.first()
        
        # Get liquidity heatmap data
        heatmap_data = MarketplaceHealthService.get_liquidity_heatmap_data()
        
        # Get trading volume sparklines
        sparkline_data = MarketplaceHealthService.get_trading_volume_sparklines()
        
        # Get recent metrics
        recent_liquidity = LiquidityMetrics.objects.select_related('collection')[:10]
        recent_trading = TradingActivityMetrics.objects.select_related('collection')[:10]
        
        return Response({
            'health_snapshot': MarketplaceHealthSnapshotSerializer(latest_snapshot).data if latest_snapshot else None,
            'liquidity_heatmap': heatmap_data,
            'volume_sparklines': sparkline_data,
            'recent_liquidity_metrics': LiquidityMetricsSerializer(recent_liquidity, many=True).data,
            'recent_trading_metrics': TradingActivityMetricsSerializer(recent_trading, many=True).data,
            'timestamp': timezone.now().isoformat()
        })


class LiquidityMetricsListView(generics.ListAPIView):
    """
    GET: Returns liquidity metrics with filtering options
    """
    serializer_class = LiquidityMetricsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = LiquidityMetrics.objects.select_related('collection')
        
        # Filter by collection
        collection_id = self.request.query_params.get('collection_id')
        if collection_id:
            queryset = queryset.filter(collection_id=collection_id)
        
        # Filter by date range
        days = int(self.request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        queryset = queryset.filter(timestamp__gte=start_date)
        
        return queryset.order_by('-timestamp')


class TradingActivityMetricsListView(generics.ListAPIView):
    """
    GET: Returns trading activity metrics with filtering options
    """
    serializer_class = TradingActivityMetricsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = TradingActivityMetrics.objects.select_related('collection')
        
        # Filter by collection
        collection_id = self.request.query_params.get('collection_id')
        if collection_id:
            queryset = queryset.filter(collection_id=collection_id)
        
        # Filter by timeframe
        timeframe = self.request.query_params.get('timeframe')
        if timeframe:
            queryset = queryset.filter(timeframe=timeframe)
        
        # Filter by date range
        days = int(self.request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        queryset = queryset.filter(timestamp__gte=start_date)
        
        return queryset.order_by('-timestamp')


class UserEngagementMetricsListView(generics.ListAPIView):
    """
    GET: Returns user engagement metrics
    """
    serializer_class = UserEngagementMetricsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = UserEngagementMetrics.objects.all()
        
        # Filter by metric type
        metric_type = self.request.query_params.get('metric_type')
        if metric_type:
            queryset = queryset.filter(metric_type=metric_type)
        
        # Filter by date range
        days = int(self.request.query_params.get('days', 90))
        start_date = timezone.now() - timedelta(days=days)
        queryset = queryset.filter(timestamp__gte=start_date)
        
        return queryset.order_by('-timestamp')


class MarketplaceHealthSnapshotListView(generics.ListAPIView):
    """
    GET: Returns marketplace health snapshots
    """
    serializer_class = MarketplaceHealthSnapshotSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        days = int(self.request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        return MarketplaceHealthSnapshot.objects.filter(
            timestamp__gte=start_date
        ).order_by('-timestamp')


@api_view(['POST'])
def generate_health_snapshot(request):
    """
    POST: Manually trigger health snapshot generation
    """
    if not request.user.is_staff:
        return Response(
            {'error': 'Permission denied'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        snapshot = MarketplaceHealthService.generate_health_snapshot()
        return Response({
            'message': 'Health snapshot generated successfully',
            'snapshot': MarketplaceHealthSnapshotSerializer(snapshot).data
        })
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def collection_liquidity_analysis(request, collection_id):
    """
    GET: Returns detailed liquidity analysis for a specific collection
    """
    try:
        collection = Collection.objects.get(id=collection_id)
        liquidity_data = MarketplaceHealthService.calculate_liquidity_metrics(collection_id)
        wash_trading_data = MarketplaceHealthService.detect_wash_trading(collection_id)
        
        return Response({
            'collection': {
                'id': collection.id,
                'name': collection.name
            },
            'liquidity_metrics': liquidity_data,
            'wash_trading_analysis': wash_trading_data,
            'timestamp': timezone.now().isoformat()
        })
    except Collection.DoesNotExist:
        return Response(
            {'error': 'Collection not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
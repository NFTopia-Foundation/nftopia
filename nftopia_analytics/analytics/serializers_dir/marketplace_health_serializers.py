# from rest_framework import serializers
# from ..models_dir.marketplace_health import (
#     LiquidityMetrics,
#     TradingActivityMetrics,
#     UserEngagementMetrics,
#     MarketplaceHealthSnapshot,
#     CollectionWatchlist
# )
# from marketplace.models import Collection
# from users.models import User


# class CollectionBasicSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Collection
#         fields = ['id', 'name', 'contract_address']


# class LiquidityMetricsSerializer(serializers.ModelSerializer):
#     collection = CollectionBasicSerializer(read_only=True)
    
#     class Meta:
#         model = LiquidityMetrics
#         fields = [
#             'id', 'collection', 'timestamp', 'bid_ask_spread',
#             'avg_bid_price', 'avg_ask_price', 'total_bids', 'total_asks',
#             'bid_volume', 'ask_volume', 'avg_time_to_fill',
#             'median_time_to_fill', 'fill_rate_24h', 'liquidity_score',
#             'created_at'
#         ]


# class TradingActivityMetricsSerializer(serializers.ModelSerializer):
#     collection = CollectionBasicSerializer(read_only=True)
#     timeframe_display = serializers.CharField(source='get_timeframe_display', read_only=True)
    
#     class Meta:
#         model = TradingActivityMetrics
#         fields = [
#             'id', 'collection', 'timeframe', 'timeframe_display', 'timestamp',
#             'trading_volume', 'volume_change_pct', 'volume_ma_7d', 'volume_ma_30d',
#             'total_trades', 'unique_traders', 'active_traders_count',
#             'new_traders_count', 'avg_trade_size', 'median_trade_size',
#             'price_volatility', 'suspected_wash_trades', 'wash_trading_score',
#             'created_at'
#         ]


# class UserEngagementMetricsSerializer(serializers.ModelSerializer):
#     metric_type_display = serializers.CharField(source='get_metric_type_display', read_only=True)
    
#     class Meta:
#         model = UserEngagementMetrics
#         fields = [
#             'id', 'metric_type', 'metric_type_display', 'timestamp',
#             'cohort_size', 'retained_users', 'retention_rate',
#             'avg_session_duration', 'median_session_duration',
#             'daily_active_users', 'weekly_active_users', 'monthly_active_users',
#             'total_watchlist_adds', 'total_watchlist_removes',
#             'net_watchlist_change', 'trending_collections_count',
#             'created_at'
#         ]


# class MarketplaceHealthSnapshotSerializer(serializers.ModelSerializer):
#     health_status_display = serializers.CharField(source='get_health_status_display', read_only=True)
    
#     class Meta:
#         model = MarketplaceHealthSnapshot
#         fields = [
#             'id', 'timestamp', 'overall_health_score', 'health_status',
#             'health_status_display', 'liquidity_score', 'trading_activity_score',
#             'user_engagement_score', 'total_24h_volume', 'total_24h_trades',
#             'active_collections', 'daily_active_users', 'has_liquidity_alerts',
#             'has_wash_trading_alerts', 'has_engagement_alerts', 'created_at'
#         ]


# class CollectionWatchlistSerializer(serializers.ModelSerializer):
#     user = serializers.StringRelatedField(read_only=True)
#     collection = CollectionBasicSerializer(read_only=True)
    
#     class Meta:
#         model = CollectionWatchlist
#         fields = [
#             'id', 'user', 'collection', 'added_at', 'removed_at',
#             'is_active', 'view_count', 'last_viewed'
#         ]
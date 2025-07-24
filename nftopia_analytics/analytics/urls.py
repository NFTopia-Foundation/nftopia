from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, heatmap
from .views_dir.visualization_views import MintingTrendVisualization
from .views_dir.collection_views import (
    CollectionMetricsView,
    CollectionMintingView,
    CollectionHoldersView
)
from .views_dir.marketplace_health_views import (
    MarketplaceHealthDashboardView,
    LiquidityMetricsListView,
    TradingActivityMetricsListView,
    UserEngagementMetricsListView,
    MarketplaceHealthSnapshotListView,
    generate_health_snapshot,
    collection_liquidity_analysis
)
from .views import UserSegmentViewSet, UserSegmentationView, AnalyzeMetadataView

app_name = "analytics"

router = DefaultRouter()
router.register(r'user-segments', UserSegmentViewSet)

urlpatterns = [
    # Dashboard views
    path("", views.analytics_dashboard, name="dashboard"),
    path("retention/", views.retention_analysis, name="retention"),
    path("wallet-trends/", views.wallet_trends, name="wallet_trends"),
    path("user-behavior/", views.user_behavior, name="user_behavior"),
    # API endpoints
    path("api/session-data/", views.api_session_data, name="api_session_data"),
    path("api/wallet-data/", views.api_wallet_data, name="api_wallet_data"),
    path("api/user-segments/", views.api_user_segments, name="api_user_segments"),
    path(
        "api/track-wallet/",
        views.track_wallet_connection,
        name="track_wallet_connection",
    ),
    # Heatmap endpoint
    path("api/analytics/heatmap/volume", heatmap.volume, name="volume"),
    path("api/analytics/heatmap/collections", heatmap.collections, name="collections"),

    # New DRF analytics endpoints
    path("api/analytics/minting/", views.MintingAnalyticsView.as_view(), name="minting_analytics"),
    path("api/analytics/sales/", views.SalesAnalyticsView.as_view(), name="sales_analytics"),
    path("api/analytics/users/", views.UserAnalyticsView.as_view(), name="user_analytics"),
    path('visualizations/minting-trend/', MintingTrendVisualization.as_view(), name='minting-trend'),

    # Collection Specific endpoiints
    path('collections/<uuid:collection_id>/metrics', CollectionMetricsView.as_view()),
    path('collections/<uuid:collection_id>/minting', CollectionMintingView.as_view()),
    path('collections/<uuid:collection_id>/holders', CollectionHoldersView.as_view()),

    path('api/', include(router.urls)),
    path('analyze/<str:cid>/', AnalyzeMetadataView.as_view(), name='analyze-metadata'),
    
    # Marketplace Health Monitoring URLs
    path('marketplace-health/dashboard/', MarketplaceHealthDashboardView.as_view(), name='marketplace-health-dashboard'),
    path('marketplace-health/liquidity/', LiquidityMetricsListView.as_view(), name='liquidity-metrics'),
    path('marketplace-health/trading/', TradingActivityMetricsListView.as_view(), name='trading-metrics'),
    path('marketplace-health/engagement/', UserEngagementMetricsListView.as_view(), name='engagement-metrics'),
    path('marketplace-health/snapshots/', MarketplaceHealthSnapshotListView.as_view(), name='health-snapshots'),
    path('marketplace-health/generate-snapshot/', generate_health_snapshot, name='generate-health-snapshot'),
    path('marketplace-health/collection/<int:collection_id>/liquidity/', collection_liquidity_analysis, name='collection-liquidity-analysis'),
]

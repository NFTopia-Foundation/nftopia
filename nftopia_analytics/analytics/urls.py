from django.urls import path, include
from . import views, heatmap

from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r"segments", views.UserSegmentViewSet, basename="segments")

app_name = "analytics"

urlpatterns = [
  
    path("api/", include(router.urls)),
    path("api/users/<int:user_id>/segments/", views.user_segments, name="user-segments"),

  
    path("",                               views.analytics_dashboard,    name="dashboard"),
    path("retention/",                     views.retention_analysis,     name="retention"),
    path("wallet-trends/",                 views.wallet_trends,          name="wallet_trends"),
    path("user-behavior/",                 views.user_behavior,          name="user_behavior"),
    path("api/session-data/",              views.api_session_data,       name="api_session_data"),
    path("api/wallet-data/",               views.api_wallet_data,        name="api_wallet_data"),
    path("api/user-segments/",             views.api_user_segments,      name="api_user_segments"),
    path("api/track-wallet/",              views.track_wallet_connection,name="track_wallet_connection"),
    path("api/analytics/heatmap/volume",   heatmap.volume,               name="volume"),
    path("api/analytics/heatmap/collections", heatmap.collections,      name="collections"),
]

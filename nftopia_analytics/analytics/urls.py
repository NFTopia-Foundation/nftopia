from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    # Dashboard views
    path('', views.analytics_dashboard, name='dashboard'),
    path('retention/', views.retention_analysis, name='retention'),
    path('wallet-trends/', views.wallet_trends, name='wallet_trends'),
    path('user-behavior/', views.user_behavior, name='user_behavior'),
    
    # API endpoints
    path('api/session-data/', views.api_session_data, name='api_session_data'),
    path('api/wallet-data/', views.api_wallet_data, name='api_wallet_data'),
    path('api/user-segments/', views.api_user_segments, name='api_user_segments'),
    path('api/track-wallet/', views.track_wallet_connection, name='track_wallet_connection'),
]

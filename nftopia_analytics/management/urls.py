from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import (
    AnomalyDetectionViewSet, AnomalyModelViewSet, 
    NFTTransactionViewSet, UserBehaviorProfileViewSet
)

router = DefaultRouter()
router.register(r'anomalies', AnomalyDetectionViewSet)
router.register(r'models', AnomalyModelViewSet)
router.register(r'transactions', NFTTransactionViewSet)
router.register(r'user-profiles', UserBehaviorProfileViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]

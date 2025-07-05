from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
from .models import AnomalyDetection, AnomalyModel, NFTTransaction, UserBehaviorProfile
from .serializers import (
    AnomalyDetectionSerializer, AnomalyModelSerializer, 
    NFTTransactionSerializer, UserBehaviorProfileSerializer
)
from .detection_engine import AnomalyDetectionEngine
from .tasks import run_anomaly_detection_task
import logging

logger = logging.getLogger(__name__)

class AnomalyDetectionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AnomalyDetection.objects.all().order_by('-detected_at')
    serializer_class = AnomalyDetectionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by severity
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(detected_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(detected_at__lte=end_date)
        
        # Filter by anomaly type
        anomaly_type = self.request.query_params.get('type')
        if anomaly_type:
            queryset = queryset.filter(anomaly_model__name=anomaly_type)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def detect_realtime(self, request):
        """Run real-time anomaly detection"""
        detection_type = request.data.get('type')
        collection_address = request.data.get('collection_address')
        wallet_address = request.data.get('wallet_address')
        
        try:
            engine = AnomalyDetectionEngine()
            kwargs = {}
            if collection_address:
                kwargs['collection_address'] = collection_address
            if wallet_address:
                kwargs['wallet_address'] = wallet_address
            
            anomalies = engine.run_detection(detection_type, **kwargs)
            
            return Response({
                'status': 'success',
                'anomalies_detected': len(anomalies),
                'anomalies': anomalies
            })
        except Exception as e:
            logger.error(f"Real-time detection error: {str(e)}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get anomaly detection statistics"""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        
        queryset = self.get_queryset().filter(
            detected_at__gte=start_date,
            detected_at__lte=end_date
        )
        
        stats = {
            'total_anomalies': queryset.count(),
            'by_severity': {},
            'by_type': {},
            'by_status': {},
            'recent_trend': []
        }
        
        # Count by severity
        for severity, _ in AnomalyDetection.SEVERITY_LEVELS:
            stats['by_severity'][severity] = queryset.filter(severity=severity).count()
        
        # Count by type
        for anomaly_type, _ in AnomalyModel.DETECTION_TYPES:
            stats['by_type'][anomaly_type] = queryset.filter(
                anomaly_model__name=anomaly_type
            ).count()
        
        # Count by status
        for status_val, _ in AnomalyDetection.STATUS_CHOICES:
            stats['by_status'][status_val] = queryset.filter(status=status_val).count()
        
        # Daily trend for last 7 days
        for i in range(7):
            day_start = end_date - timedelta(days=i+1)
            day_end = end_date - timedelta(days=i)
            daily_count = queryset.filter(
                detected_at__gte=day_start,
                detected_at__lt=day_end
            ).count()
            stats['recent_trend'].append({
                'date': day_start.date().isoformat(),
                'count': daily_count
            })
        
        return Response(stats)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update anomaly status"""
        anomaly = self.get_object()
        new_status = request.data.get('status')
        notes = request.data.get('notes', '')
        
        if new_status not in dict(AnomalyDetection.STATUS_CHOICES):
            return Response({
                'error': 'Invalid status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        anomaly.status = new_status
        anomaly.notes = notes
        if new_status == 'resolved':
            anomaly.resolved_at = timezone.now()
            anomaly.resolved_by = request.user
        
        anomaly.save()
        
        return Response({
            'status': 'success',
            'message': 'Anomaly status updated'
        })

class AnomalyModelViewSet(viewsets.ModelViewSet):
    queryset = AnomalyModel.objects.all()
    serializer_class = AnomalyModelSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['post'])
    def test_detection(self, request, pk=None):
        """Test detection model with current parameters"""
        model = self.get_object()
        
        try:
            engine = AnomalyDetectionEngine()
            anomalies = engine.run_detection(model.name)
            
            return Response({
                'status': 'success',
                'model': model.name,
                'anomalies_found': len(anomalies),
                'test_results': anomalies[:5]  # Return first 5 for preview
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class NFTTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = NFTTransaction.objects.all().order_by('-timestamp')
    serializer_class = NFTTransactionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by collection
        collection = self.request.query_params.get('collection')
        if collection:
            queryset = queryset.filter(nft_contract=collection)
        
        # Filter by transaction type
        tx_type = self.request.query_params.get('type')
        if tx_type:
            queryset = queryset.filter(transaction_type=tx_type)
        
        # Filter by address
        address = self.request.query_params.get('address')
        if address:
            queryset = queryset.filter(
                models.Q(buyer_address=address) | models.Q(seller_address=address)
            )
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def volume_analysis(self, request):
        """Get trading volume analysis"""
        collection = request.query_params.get('collection')
        days = int(request.query_params.get('days', 7))
        
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        queryset = self.get_queryset().filter(
            timestamp__gte=start_date,
            transaction_type='sale'
        )
        
        if collection:
            queryset = queryset.filter(nft_contract=collection)
        
        # Daily volume aggregation
        daily_volumes = {}
        for tx in queryset:
            day_key = tx.timestamp.date()
            if day_key not in daily_volumes:
                daily_volumes[day_key] = {'volume': 0, 'count': 0}
            daily_volumes[day_key]['volume'] += float(tx.price or 0)
            daily_volumes[day_key]['count'] += 1
        
        return Response({
            'period_days': days,
            'collection': collection,
            'daily_data': [
                {
                    'date': date.isoformat(),
                    'volume': data['volume'],
                    'transaction_count': data['count']
                }
                for date, data in sorted(daily_volumes.items())
            ]
        })

class UserBehaviorProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserBehaviorProfile.objects.all().order_by('-risk_score')
    serializer_class = UserBehaviorProfileSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def high_risk_users(self, request):
        """Get users with high risk scores"""
        threshold = float(request.query_params.get('threshold', 0.7))
        
        high_risk_users = self.get_queryset().filter(risk_score__gte=threshold)
        
        return Response({
            'threshold': threshold,
            'count': high_risk_users.count(),
            'users': UserBehaviorProfileSerializer(high_risk_users[:20], many=True).data
        })

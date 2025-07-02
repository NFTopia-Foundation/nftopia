from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .detection_engine import AnomalyDetectionEngine
from .models import AnomalyDetection, AlertWebhook, WebhookLog, UserBehaviorProfile, NFTTransaction
from .webhook_service import WebhookService
import logging

logger = logging.getLogger(__name__)

@shared_task
def run_anomaly_detection_task(detection_type=None):
    """Celery task to run anomaly detection"""
    try:
        engine = AnomalyDetectionEngine()
        anomalies = engine.run_detection(detection_type)
        
        logger.info(f"Anomaly detection completed. Found {len(anomalies)} anomalies.")
        
        # Trigger webhooks for new anomalies
        trigger_webhooks_task.delay()
        
        return {
            'status': 'success',
            'anomalies_detected': len(anomalies)
        }
    except Exception as e:
        logger.error(f"Anomaly detection task failed: {str(e)}")
        return {
            'status': 'error',
            'message': str(e)
        }

@shared_task
def trigger_webhooks_task():
    """Trigger webhooks for recent anomalies"""
    try:
        # Get recent unprocessed anomalies
        recent_anomalies = AnomalyDetection.objects.filter(
            detected_at__gte=timezone.now() - timedelta(minutes=5),
            status='pending'
        )
        
        webhook_service = WebhookService()
        
        for anomaly in recent_anomalies:
            webhook_service.send_anomaly_alert(anomaly)
        
        logger.info(f"Webhook processing completed for {recent_anomalies.count()} anomalies.")
        
    except Exception as e:
        logger.error(f"Webhook task failed: {str(e)}")

@shared_task
def update_user_behavior_profiles_task():
    """Update user behavior profiles based on recent activity"""
    try:
        end_time = timezone.now()
        start_time = end_time - timedelta(days=7)  # Look at last 7 days
        
        # Get all unique wallet addresses from recent transactions
        recent_addresses = set()
        recent_txs = NFTTransaction.objects.filter(timestamp__gte=start_time)
        
        for tx in recent_txs:
            if tx.buyer_address:
                recent_addresses.add(tx.buyer_address)
            if tx.seller_address:
                recent_addresses.add(tx.seller_address)
        
        updated_profiles = 0
        
        for address in recent_addresses:
            profile, created = UserBehaviorProfile.objects.get_or_create(
                wallet_address=address,
                defaults={
                    'first_seen': timezone.now(),
                    'last_activity': timezone.now()
                }
            )
            
            # Get all transactions for this address
            user_txs = NFTTransaction.objects.filter(
                models.Q(buyer_address=address) | models.Q(seller_address=address)
            )
            
            if user_txs.exists():
                # Calculate metrics
                total_volume = sum(float(tx.price or 0) for tx in user_txs)
                total_count = user_txs.count()
                
                # Calculate average transaction value
                avg_value = total_volume / total_count if total_count > 0 else 0
                
                # Calculate frequency (transactions per day)
                first_tx = user_txs.order_by('timestamp').first()
                last_tx = user_txs.order_by('timestamp').last()
                
                if first_tx and last_tx:
                    days_active = (last_tx.timestamp - first_tx.timestamp).days + 1
                    frequency = total_count / days_active if days_active > 0 else 0
                else:
                    frequency = 0
                
                # Get preferred collections
                collections = {}
                for tx in user_txs:
                    if tx.nft_contract not in collections:
                        collections[tx.nft_contract] = 0
                    collections[tx.nft_contract] += 1
                
                preferred_collections = sorted(
                    collections.items(), 
                    key=lambda x: x[1], 
                    reverse=True
                )[:5]  # Top 5 collections
                
                # Calculate risk score (simplified)
                risk_score = 0.0
                
                # High frequency trading increases risk
                if frequency > 10:  # More than 10 transactions per day
                    risk_score += 0.3
                
                # Large volume increases risk
                if total_volume > 100:  # More than 100 ETH total volume
                    risk_score += 0.2
                
                # Few preferred collections (might indicate wash trading)
                if len(preferred_collections) <= 2 and total_count > 10:
                    risk_score += 0.3
                
                # Update profile
                profile.avg_transaction_value = avg_value
                profile.transaction_frequency = frequency
                profile.total_transactions = total_count
                profile.total_volume = total_volume
                profile.preferred_collections = [col[0] for col in preferred_collections]
                profile.risk_score = min(risk_score, 1.0)
                profile.last_activity = last_tx.timestamp if last_tx else timezone.now()
                profile.save()
                
                updated_profiles += 1
        
        logger.info(f"Updated {updated_profiles} user behavior profiles.")
        
        return {
            'status': 'success',
            'profiles_updated': updated_profiles
        }
        
    except Exception as e:
        logger.error(f"User behavior profile update task failed: {str(e)}")
        return {
            'status': 'error',
            'message': str(e)
        }

@shared_task
def cleanup_old_data_task():
    """Clean up old anomaly detections and logs"""
    try:
        # Delete anomalies older than 90 days
        cutoff_date = timezone.now() - timedelta(days=90)
        
        old_anomalies = AnomalyDetection.objects.filter(detected_at__lt=cutoff_date)
        deleted_anomalies = old_anomalies.count()
        old_anomalies.delete()
        
        # Delete webhook logs older than 30 days
        log_cutoff = timezone.now() - timedelta(days=30)
        old_logs = WebhookLog.objects.filter(sent_at__lt=log_cutoff)
        deleted_logs = old_logs.count()
        old_logs.delete()
        
        logger.info(f"Cleanup completed. Deleted {deleted_anomalies} anomalies and {deleted_logs} webhook logs.")
        
        return {
            'status': 'success',
            'deleted_anomalies': deleted_anomalies,
            'deleted_logs': deleted_logs
        }
        
    except Exception as e:
        logger.error(f"Cleanup task failed: {str(e)}")
        return {
            'status': 'error',
            'message': str(e)
        }

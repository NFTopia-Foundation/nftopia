import requests
import hashlib
import hmac
import json
from django.conf import settings
from .models import AlertWebhook, WebhookLog, AnomalyDetection
import logging

logger = logging.getLogger(__name__)

class WebhookService:
    def send_anomaly_alert(self, anomaly: AnomalyDetection):
        """Send anomaly alert to all configured webhooks"""
        
        # Get applicable webhooks
        webhooks = AlertWebhook.objects.filter(
            is_active=True,
            min_severity__in=self._get_severity_levels_above(anomaly.severity)
        )
        
        # Filter by anomaly type if specified
        for webhook in webhooks:
            if webhook.anomaly_types and anomaly.anomaly_model.name not in webhook.anomaly_types:
                continue
            
            self._send_webhook(webhook, anomaly)
    
    def _send_webhook(self, webhook: AlertWebhook, anomaly: AnomalyDetection):
        """Send individual webhook"""
        try:
            payload = self._create_payload(anomaly)
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'NFT-Anomaly-Detection/1.0'
            }
            
            # Add signature if secret key is provided
            if webhook.secret_key:
                signature = self._create_signature(payload, webhook.secret_key)
                headers['X-Signature-SHA256'] = signature
            
            response = requests.post(
                webhook.url,
                data=json.dumps(payload),
                headers=headers,
                timeout=30
            )
            
            # Log the webhook call
            WebhookLog.objects.create(
                webhook=webhook,
                anomaly=anomaly,
                status_code=response.status_code,
                response_body=response.text[:1000]  # Limit response body length
            )
            
            if response.status_code == 200:
                logger.info(f"Webhook {webhook.name} sent successfully for anomaly {anomaly.id}")
            else:
                logger.warning(f"Webhook {webhook.name} returned status {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to send webhook {webhook.name}: {str(e)}")
            
            # Log the failed attempt
            WebhookLog.objects.create(
                webhook=webhook,
                anomaly=anomaly,
                status_code=0,
                response_body=f"Request failed: {str(e)}"
            )
    
    def _create_payload(self, anomaly: AnomalyDetection) -> dict:
        """Create webhook payload"""
        return {
            'event': 'anomaly_detected',
            'timestamp': anomaly.detected_at.isoformat(),
            'anomaly': {
                'id': anomaly.id,
                'type': anomaly.anomaly_model.name,
                'type_display': anomaly.anomaly_model.get_name_display(),
                'severity': anomaly.severity,
                'severity_display': anomaly.get_severity_display(),
                'confidence_score': anomaly.confidence_score,
                'status': anomaly.status,
                'data': anomaly.anomaly_data,
                'detected_at': anomaly.detected_at.isoformat()
            },
            'transaction': {
                'hash': anomaly.transaction.transaction_hash if anomaly.transaction else None,
                'nft_contract': anomaly.transaction.nft_contract if anomaly.transaction else None,
                'token_id': anomaly.transaction.token_id if anomaly.transaction else None,
                'price': float(anomaly.transaction.price) if anomaly.transaction and anomaly.transaction.price else None
            } if anomaly.transaction else None
        }
    
    def _create_signature(self, payload: dict, secret: str) -> str:
        """Create HMAC signature for webhook security"""
        payload_bytes = json.dumps(payload, sort_keys=True).encode('utf-8')
        signature = hmac.new(
            secret.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        return f"sha256={signature}"
    
    def _get_severity_levels_above(self, severity: str) -> list:
        """Get all severity levels at or above the given level"""
        severity_order = ['low', 'medium', 'high', 'critical']
        try:
            index = severity_order.index(severity)
            return severity_order[index:]
        except ValueError:
            return ['critical']  # Default to highest severity if unknown

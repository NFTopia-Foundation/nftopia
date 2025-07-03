from rest_framework import serializers
from .models import (
    AnomalyDetection, AnomalyModel, NFTTransaction, 
    UserBehaviorProfile, AlertWebhook, WebhookLog
)

class AnomalyModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnomalyModel
        fields = '__all__'

class AnomalyDetectionSerializer(serializers.ModelSerializer):
    anomaly_model_name = serializers.CharField(source='anomaly_model.get_name_display', read_only=True)
    
    class Meta:
        model = AnomalyDetection
        fields = '__all__'

class NFTTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = NFTTransaction
        fields = '__all__'

class UserBehaviorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserBehaviorProfile
        fields = '__all__'

class AlertWebhookSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertWebhook
        fields = '__all__'

class WebhookLogSerializer(serializers.ModelSerializer):
    webhook_name = serializers.CharField(source='webhook.name', read_only=True)
    
    class Meta:
        model = WebhookLog
        fields = '__all__'

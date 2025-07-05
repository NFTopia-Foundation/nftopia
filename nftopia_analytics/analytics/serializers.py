from rest_framework import serializers
from .models import (
    AnomalyDetection, AnomalyModel, NFTTransaction, 
    UserBehaviorProfile, AlertWebhook, WebhookLog, UserSegment,
    UserSegmentMembership
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



class UserSegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSegment
        fields = '__all__'
        read_only_fields = ('created_at', 'last_updated')

class UserSegmentMembershipSerializer(serializers.ModelSerializer):
    segment = UserSegmentSerializer(read_only=True)
    
    class Meta:
        model = UserSegmentMembership
        fields = '__all__'
        read_only_fields = ('joined_at', 'last_evaluated')
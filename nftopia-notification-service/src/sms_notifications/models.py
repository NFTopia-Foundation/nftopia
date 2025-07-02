from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid

class SMSNotification(models.Model):
    NOTIFICATION_TYPES = [
        ('bid_alert', 'Bid Alert'),
        ('auction_alert', 'Auction Alert'),
        ('two_factor_auth', 'Two Factor Authentication'),
        ('transaction_confirmation', 'Transaction Confirmation'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('undelivered', 'Undelivered'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sms_notifications')
    phone_number = models.CharField(max_length=20)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    twilio_sid = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, null=True)
    
    # NFT-specific fields
    nft_id = models.CharField(max_length=100, blank=True, null=True)
    auction_id = models.CharField(max_length=100, blank=True, null=True)
    bid_amount = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    transaction_hash = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['notification_type']),
        ]

    def __str__(self):
        return f"SMS to {self.phone_number} - {self.notification_type}"

class SMSRateLimit(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    hour_window = models.DateTimeField()
    sms_count = models.IntegerField(default=0)
    
    class Meta:
        unique_together = ['user', 'hour_window']
        indexes = [
            models.Index(fields=['user', 'hour_window']),
        ]

class CarrierCompliance(models.Model):
    carrier_name = models.CharField(max_length=100)
    country_code = models.CharField(max_length=5)
    max_message_length = models.IntegerField(default=160)
    supports_unicode = models.BooleanField(default=True)
    restricted_keywords = models.JSONField(default=list)
    opt_out_required = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['carrier_name', 'country_code']

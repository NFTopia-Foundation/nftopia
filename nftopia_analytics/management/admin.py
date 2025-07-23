from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    AnomalyModel, AnomalyDetection, NFTTransaction, 
    UserBehaviorProfile, AlertWebhook, WebhookLog
)
import json

@admin.register(AnomalyModel)
class AnomalyModelAdmin(admin.ModelAdmin):
    list_display = ['name', 'threshold', 'lookback_window', 'is_active', 'created_at']
    list_filter = ['name', 'is_active', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'threshold', 'lookback_window', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(AnomalyDetection)
class AnomalyDetectionAdmin(admin.ModelAdmin):
    list_display = [
        'anomaly_type', 'severity_badge', 'status_badge', 
        'confidence_score', 'detected_at', 'resolved_by'
    ]
    list_filter = [
        'severity', 'status', 'anomaly_model__name', 
        'detected_at', 'resolved_at'
    ]
    search_fields = ['anomaly_model__name', 'notes']
    readonly_fields = ['detected_at', 'confidence_score', 'anomaly_data_display']
    
    fieldsets = (
        ('Detection Information', {
            'fields': ('anomaly_model', 'transaction', 'severity', 'confidence_score')
        }),
        ('Status', {
            'fields': ('status', 'resolved_by', 'resolved_at', 'notes')
        }),
        ('Data', {
            'fields': ('anomaly_data_display',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('detected_at',),
            'classes': ('collapse',)
        }),
    )
    
    def anomaly_type(self, obj):
        return obj.anomaly_model.get_name_display()
    anomaly_type.short_description = 'Type'
    
    def severity_badge(self, obj):
        colors = {
            'low': '#28a745',
            'medium': '#ffc107', 
            'high': '#fd7e14',
            'critical': '#dc3545'
        }
        color = colors.get(obj.severity, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_severity_display()
        )
    severity_badge.short_description = 'Severity'
    
    def status_badge(self, obj):
        colors = {
            'pending': '#6c757d',
            'confirmed': '#dc3545',
            'false_positive': '#28a745',
            'resolved': '#17a2b8'
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def anomaly_data_display(self, obj):
        if obj.anomaly_data:
            formatted_json = json.dumps(obj.anomaly_data, indent=2)
            return format_html('<pre>{}</pre>', formatted_json)
        return 'No data'
    anomaly_data_display.short_description = 'Anomaly Data'
    
    actions = ['mark_as_confirmed', 'mark_as_false_positive', 'mark_as_resolved']
    
    def mark_as_confirmed(self, request, queryset):
        queryset.update(status='confirmed')
        self.message_user(request, f'{queryset.count()} anomalies marked as confirmed.')
    mark_as_confirmed.short_description = 'Mark selected anomalies as confirmed'
    
    def mark_as_false_positive(self, request, queryset):
        queryset.update(status='false_positive')
        self.message_user(request, f'{queryset.count()} anomalies marked as false positive.')
    mark_as_false_positive.short_description = 'Mark selected anomalies as false positive'
    
    def mark_as_resolved(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='resolved', resolved_at=timezone.now(), resolved_by=request.user)
        self.message_user(request, f'{queryset.count()} anomalies marked as resolved.')
    mark_as_resolved.short_description = 'Mark selected anomalies as resolved'

@admin.register(NFTTransaction)
class NFTTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'transaction_hash_short', 'nft_info', 'transaction_type', 
        'price', 'currency', 'timestamp'
    ]
    list_filter = ['transaction_type', 'currency', 'timestamp']
    search_fields = [
        'transaction_hash', 'nft_contract', 'token_id', 
        'buyer_address', 'seller_address'
    ]
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Transaction Details', {
            'fields': (
                'transaction_hash', 'nft_contract', 'token_id', 
                'transaction_type', 'price', 'currency'
            )
        }),
        ('Parties', {
            'fields': ('buyer_address', 'seller_address')
        }),
        ('Blockchain Data', {
            'fields': ('timestamp', 'block_number', 'gas_used'),
            'classes': ('collapse',)
        }),
        ('System', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def transaction_hash_short(self, obj):
        return f"{obj.transaction_hash[:10]}...{obj.transaction_hash[-8:]}"
    transaction_hash_short.short_description = 'Transaction Hash'
    
    def nft_info(self, obj):
        return f"{obj.nft_contract[:8]}...:{obj.token_id}"
    nft_info.short_description = 'NFT'

@admin.register(UserBehaviorProfile)
class UserBehaviorProfileAdmin(admin.ModelAdmin):
    list_display = [
        'wallet_address_short', 'risk_score_badge', 'total_transactions', 
        'total_volume', 'last_activity'
    ]
    list_filter = ['risk_score', 'first_seen', 'last_activity']
    search_fields = ['wallet_address']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Wallet Information', {
            'fields': ('wallet_address', 'risk_score')
        }),
        ('Behavior Metrics', {
            'fields': (
                'avg_transaction_value', 'transaction_frequency', 
                'total_transactions', 'total_volume'
            )
        }),
        ('Activity', {
            'fields': ('first_seen', 'last_activity', 'preferred_collections')
        }),
        ('System', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def wallet_address_short(self, obj):
        return f"{obj.wallet_address[:8]}...{obj.wallet_address[-6:]}"
    wallet_address_short.short_description = 'Wallet Address'
    
    def risk_score_badge(self, obj):
        if obj.risk_score >= 0.8:
            color = '#dc3545'  # Red
        elif obj.risk_score >= 0.6:
            color = '#fd7e14'  # Orange
        elif obj.risk_score >= 0.4:
            color = '#ffc107'  # Yellow
        else:
            color = '#28a745'  # Green
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 3px;">{:.2f}</span>',
            color, obj.risk_score
        )
    risk_score_badge.short_description = 'Risk Score'

@admin.register(AlertWebhook)
class AlertWebhookAdmin(admin.ModelAdmin):
    list_display = ['name', 'url', 'is_active', 'min_severity', 'created_at']
    list_filter = ['is_active', 'min_severity', 'created_at']
    search_fields = ['name', 'url']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Webhook Configuration', {
            'fields': ('name', 'url', 'is_active', 'secret_key')
        }),
        ('Trigger Settings', {
            'fields': ('anomaly_types', 'min_severity')
        }),
        ('System', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

@admin.register(WebhookLog)
class WebhookLogAdmin(admin.ModelAdmin):
    list_display = ['webhook', 'anomaly', 'status_code', 'sent_at']
    list_filter = ['status_code', 'sent_at', 'webhook']
    search_fields = ['webhook__name', 'response_body']
    readonly_fields = ['sent_at']
    
    def has_add_permission(self, request):
        return False  # Logs are created automatically

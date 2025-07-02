from django.contrib import admin
from django.utils.html import format_html
from .models import SMSNotification, SMSRateLimit, CarrierCompliance

@admin.register(SMSNotification)
class SMSNotificationAdmin(admin.ModelAdmin):
    list_display = ['phone_number', 'notification_type', 'status', 'created_at', 'user']
    list_filter = ['status', 'notification_type', 'created_at']
    search_fields = ['phone_number', 'user__username', 'user__email', 'twilio_sid']
    readonly_fields = ['id', 'twilio_sid', 'created_at', 'sent_at', 'delivered_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'phone_number', 'notification_type', 'status')
        }),
        ('Message', {
            'fields': ('message',)
        }),
        ('NFT Details', {
            'fields': ('nft_id', 'auction_id', 'bid_amount', 'transaction_hash'),
            'classes': ('collapse',)
        }),
        ('Twilio Information', {
            'fields': ('twilio_sid', 'error_message'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'sent_at', 'delivered_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')

@admin.register(SMSRateLimit)
class SMSRateLimitAdmin(admin.ModelAdmin):
    list_display = ['user', 'hour_window', 'sms_count']
    list_filter = ['hour_window']
    search_fields = ['user__username', 'user__email']

@admin.register(CarrierCompliance)
class CarrierComplianceAdmin(admin.ModelAdmin):
    list_display = ['carrier_name', 'country_code', 'max_message_length', 'supports_unicode', 'opt_out_required']
    list_filter = ['country_code', 'supports_unicode', 'opt_out_required']
    search_fields = ['carrier_name', 'country_code']

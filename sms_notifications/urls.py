from django.urls import path
from . import views

app_name = 'sms_notifications'

urlpatterns = [
    path('webhook/status/', views.twilio_status_webhook, name='twilio_webhook'),
    path('notifications/', views.sms_notifications_list, name='notifications_list'),
    path('notifications/<uuid:notification_id>/', views.sms_notification_detail, name='notification_detail'),
    path('api/stats/', views.SMSStatsView.as_view(), name='sms_stats'),
]

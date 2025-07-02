import logging
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils.decorators import method_decorator
from django.views import View
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404
from django.core.paginator import Paginator

from .services import TwilioSMSService
from .models import SMSNotification

logger = logging.getLogger(__name__)

@csrf_exempt
@require_POST
def twilio_status_webhook(request):
    """Handle Twilio delivery status webhooks"""
    try:
        message_sid = request.POST.get('MessageSid')
        status = request.POST.get('MessageStatus')
        
        if not message_sid or not status:
            logger.error("Missing MessageSid or MessageStatus in webhook")
            return HttpResponse(status=400)
        
        sms_service = TwilioSMSService()
        sms_service.handle_delivery_receipt(message_sid, status)
        
        return HttpResponse(status=200)
        
    except Exception as e:
        logger.error(f"Error processing Twilio webhook: {e}")
        return HttpResponse(status=500)

@login_required
def sms_notifications_list(request):
    """List SMS notifications for the current user"""
    notifications = SMSNotification.objects.filter(user=request.user)
    
    # Filter by type if specified
    notification_type = request.GET.get('type')
    if notification_type:
        notifications = notifications.filter(notification_type=notification_type)
    
    # Filter by status if specified
    status = request.GET.get('status')
    if status:
        notifications = notifications.filter(status=status)
    
    paginator = Paginator(notifications, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'notification_types': SMSNotification.NOTIFICATION_TYPES,
        'status_choices': SMSNotification.STATUS_CHOICES,
        'current_type': notification_type,
        'current_status': status,
    }
    
    return render(request, 'sms_notifications/list.html', context)

@login_required
def sms_notification_detail(request, notification_id):
    """View details of a specific SMS notification"""
    notification = get_object_or_404(
        SMSNotification, 
        id=notification_id, 
        user=request.user
    )
    
    return render(request, 'sms_notifications/detail.html', {
        'notification': notification
    })

class SMSStatsView(View):
    """API endpoint for SMS statistics"""
    
    @method_decorator(login_required)
    def get(self, request):
        user = request.user
        
        # Get stats for the last 30 days
        from django.utils import timezone
        from datetime import timedelta
        
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        notifications = SMSNotification.objects.filter(
            user=user,
            created_at__gte=thirty_days_ago
        )
        
        stats = {
            'total_sent': notifications.count(),
            'delivered': notifications.filter(status='delivered').count(),
            'failed': notifications.filter(status='failed').count(),
            'pending': notifications.filter(status='pending').count(),
            'by_type': {}
        }
        
        # Stats by notification type
        for type_code, type_name in SMSNotification.NOTIFICATION_TYPES:
            count = notifications.filter(notification_type=type_code).count()
            stats['by_type'][type_name] = count
        
        return JsonResponse(stats)

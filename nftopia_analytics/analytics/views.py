from django.shortcuts import render
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Count, Avg, Q
from datetime import timedelta
from .models import UserSession, RetentionCohort, WalletConnection, UserBehaviorMetrics, PageView
from .utils import (
    calculate_retention_cohorts, get_wallet_analytics, 
    get_session_analytics, get_user_segmentation
)


def is_staff_user(user):
    """Check if user is staff"""
    return user.is_staff


@login_required
@user_passes_test(is_staff_user)
def analytics_dashboard(request):
    """Main analytics dashboard view"""
    # Get recent analytics data
    session_data = get_session_analytics(days=30)
    wallet_data = get_wallet_analytics()
    user_segments = get_user_segmentation()
    
    # Get recent activity
    recent_sessions = UserSession.objects.select_related('user').order_by('-login_at')[:10]
    recent_connections = WalletConnection.objects.select_related('user').order_by('-attempted_at')[:10]
    
    context = {
        'session_data': session_data,
        'wallet_data': wallet_data,
        'user_segments': user_segments,
        'recent_sessions': recent_sessions,
        'recent_connections': recent_connections,
    }
    
    return render(request, 'analytics/dashboard.html', context)


@login_required
@user_passes_test(is_staff_user)
def retention_analysis(request):
    """Retention analysis view"""
    period_type = request.GET.get('period', 'weekly')
    
    # Calculate retention cohorts
    calculate_retention_cohorts(period_type)
    
    # Get retention data
    cohorts = RetentionCohort.objects.filter(period_type=period_type).order_by(
        '-cohort_date', 'period_number'
    )
    
    # Group by cohort date
    cohort_data = {}
    for cohort in cohorts:
        date_key = cohort.cohort_date.strftime('%Y-%m-%d')
        if date_key not in cohort_data:
            cohort_data[date_key] = []
        cohort_data[date_key].append({
            'period': cohort.period_number,
            'retention_rate': float(cohort.retention_rate),
            'retained_users': cohort.retained_users,
            'total_users': cohort.total_users
        })
    
    context = {
        'period_type': period_type,
        'cohort_data': cohort_data,
    }
    
    return render(request, 'analytics/retention.html', context)


@login_required
@user_passes_test(is_staff_user)
def wallet_trends(request):
    """Wallet trends analysis view"""
    wallet_data = get_wallet_analytics()
    
    # Get connection trends over time
    days = int(request.GET.get('days', 30))
    start_date = timezone.now() - timedelta(days=days)
    
    daily_connections = WalletConnection.objects.filter(
        attempted_at__gte=start_date
    ).extra(
        select={'day': 'date(attempted_at)'}
    ).values('day').annotate(
        total=Count('id'),
        successful=Count('id', filter=Q(connection_status='success')),
        failed=Count('id', filter=Q(connection_status='failed'))
    ).order_by('day')
    
    context = {
        'wallet_data': wallet_data,
        'daily_connections': list(daily_connections),
        'days': days,
    }
    
    return render(request, 'analytics/wallet_trends.html', context)


@login_required
@user_passes_test(is_staff_user)
def user_behavior(request):
    """User behavior analysis view"""
    user_segments = get_user_segmentation()
    
    # Get top pages
    top_pages = PageView.objects.values('path').annotate(
        view_count=Count('id'),
        unique_users=Count('user', distinct=True)
    ).order_by('-view_count')[:20]
    
    # Get user journey data
    user_journeys = PageView.objects.filter(
        user__isnull=False,
        timestamp__gte=timezone.now() - timedelta(days=7)
    ).select_related('user').order_by('user', 'timestamp')
    
    context = {
        'user_segments': user_segments,
        'top_pages': top_pages,
        'user_journeys': user_journeys[:100],  # Limit for performance
    }
    
    return render(request, 'analytics/user_behavior.html', context)


# API endpoints for AJAX requests
@login_required
@user_passes_test(is_staff_user)
def api_session_data(request):
    """API endpoint for session data"""
    days = int(request.GET.get('days', 30))
    data = get_session_analytics(days)
    return JsonResponse(data)


@login_required
@user_passes_test(is_staff_user)
def api_wallet_data(request):
    """API endpoint for wallet data"""
    data = get_wallet_analytics()
    return JsonResponse(data)


@login_required
@user_passes_test(is_staff_user)
def api_user_segments(request):
    """API endpoint for user segmentation data"""
    data = get_user_segmentation()
    return JsonResponse(data)


def track_wallet_connection(request):
    """API endpoint to track wallet connections"""
    if request.method == 'POST':
        try:
            import json
            data = json.loads(request.body)
            
            if request.user.is_authenticated:
                WalletConnection.objects.create(
                    user=request.user,
                    wallet_provider=data.get('provider', 'other'),
                    wallet_address=data.get('address', ''),
                    connection_status=data.get('status', 'failed'),
                    error_message=data.get('error', ''),
                    ip_address=request.META.get('REMOTE_ADDR', ''),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
                # Update user behavior metrics
                if hasattr(request.user, 'behavior_metrics'):
                    request.user.behavior_metrics.update_metrics()
                
                return JsonResponse({'status': 'success'})
            else:
                return JsonResponse({'status': 'error', 'message': 'User not authenticated'})
                
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})

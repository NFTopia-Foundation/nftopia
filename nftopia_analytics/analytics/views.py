from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import JsonResponse, HttpResponse
from django.utils import timezone
from django.db.models import Count, Avg, Q
from datetime import timedelta

from rest_framework import viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from .models import (
    UserSession, RetentionCohort, WalletConnection,
    UserBehaviorMetrics, PageView, UserSegment
)
from .utils import (
    calculate_retention_cohorts, get_wallet_analytics,
    get_session_analytics, get_user_segmentation
)
from .services import refresh_segment_memberships, export_segment_csv
from .serializers import (
    UserSegmentSerializer, UserSegmentMembershipSerializer
)
from django.contrib.auth import get_user_model

User = get_user_model()

def is_staff_user(user):
    return user.is_staff


@login_required
@user_passes_test(is_staff_user)
def analytics_dashboard(request):
    session_data     = get_session_analytics(days=30)
    wallet_data      = get_wallet_analytics()
    user_segments    = get_user_segmentation()
    recent_sessions  = UserSession.objects.select_related('user').order_by('-login_at')[:10]
    recent_conns     = WalletConnection.objects.select_related('user').order_by('-attempted_at')[:10]

    return render(request, 'analytics/dashboard.html', {
        'session_data': session_data,
        'wallet_data': wallet_data,
        'user_segments': user_segments,
        'recent_sessions': recent_sessions,
        'recent_connections': recent_conns,
    })


@login_required
@user_passes_test(is_staff_user)
def retention_analysis(request):
    period_type = request.GET.get('period', 'weekly')
    calculate_retention_cohorts(period_type)
    cohorts = RetentionCohort.objects.filter(period_type=period_type).order_by('-cohort_date','period_number')

    cohort_data = {}
    for c in cohorts:
        key = c.cohort_date.strftime('%Y-%m-%d')
        cohort_data.setdefault(key, []).append({
            'period': c.period_number,
            'retention_rate': float(c.retention_rate),
            'retained_users': c.retained_users,
            'total_users': c.total_users
        })

    return render(request, 'analytics/retention.html', {
        'period_type': period_type,
        'cohort_data': cohort_data,
    })


@login_required
@user_passes_test(is_staff_user)
def wallet_trends(request):
    wallet_data = get_wallet_analytics()
    days = int(request.GET.get('days', 30))
    start_date = timezone.now() - timedelta(days=days)
    daily_connections = WalletConnection.objects.filter(attempted_at__gte=start_date) \
        .extra(select={'day':'date(attempted_at)'}) \
        .values('day') \
        .annotate(
            total=Count('id'),
            successful=Count('id', filter=Q(connection_status='success')),
            failed=Count('id', filter=Q(connection_status='failed'))
        ).order_by('day')

    return render(request, 'analytics/wallet_trends.html', {
        'wallet_data': wallet_data,
        'daily_connections': list(daily_connections),
        'days': days,
    })


@login_required
@user_passes_test(is_staff_user)
def user_behavior(request):
    user_segments = get_user_segmentation()
    top_pages = PageView.objects.values('path') \
        .annotate(view_count=Count('id'), unique_users=Count('user', distinct=True)) \
        .order_by('-view_count')[:20]
    user_journeys = PageView.objects.filter(
        user__isnull=False,
        timestamp__gte=timezone.now() - timedelta(days=7)
    ).select_related('user').order_by('user','timestamp')

    return render(request, 'analytics/user_behavior.html', {
        'user_segments': user_segments,
        'top_pages': top_pages,
        'user_journeys': user_journeys[:100],
    })


@login_required
@user_passes_test(is_staff_user)
def api_session_data(request):
    days = int(request.GET.get('days', 30))
    return JsonResponse(get_session_analytics(days))


@login_required
@user_passes_test(is_staff_user)
def api_wallet_data(request):
    return JsonResponse(get_wallet_analytics())


@login_required
@user_passes_test(is_staff_user)
def api_user_segments(request):
    return JsonResponse(get_user_segmentation())


@login_required
@user_passes_test(is_staff_user)
def track_wallet_connection(request):
    if request.method == 'POST':
        import json
        data = json.loads(request.body)
        if request.user.is_authenticated:
            WalletConnection.objects.create(
                user=request.user,
                wallet_provider=data.get('provider','other'),
                wallet_address=data.get('address',''),
                connection_status=data.get('status','failed'),
                error_message=data.get('error',''),
                ip_address=request.META.get('REMOTE_ADDR',''),
                user_agent=request.META.get('HTTP_USER_AGENT','')
            )
            if hasattr(request.user, 'behavior_metrics'):
                request.user.behavior_metrics.update_metrics()
            return JsonResponse({'status':'success'})
        return JsonResponse({'status':'error','message':'User not authenticated'})
    return JsonResponse({'status':'error','message':'Invalid request method'})


class UserSegmentViewSet(viewsets.ModelViewSet):
    queryset         = UserSegment.objects.all()
    serializer_class = UserSegmentSerializer

    def perform_create(self, serializer):
        seg = serializer.save()
        refresh_segment_memberships(seg)

    def perform_update(self, serializer):
        seg = serializer.save()
        refresh_segment_memberships(seg)

    @action(detail=True, methods=['get'])
    def users(self, request, pk=None):
        seg = self.get_object()
        ms  = seg.memberships.select_related("user")
        return Response(UserSegmentMembershipSerializer(ms, many=True).data)

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        seg      = self.get_object()
        csv_data = export_segment_csv(seg)
        resp     = HttpResponse(csv_data, content_type="text/csv")
        resp["Content-Disposition"] = f'attachment; filename="{seg.name}.csv"'
        return resp

@api_view(["GET"])
@login_required
@user_passes_test(is_staff_user)
def user_segments(request, user_id):
    user = get_object_or_404(User, pk=user_id)
    ms   = user.segment_memberships.select_related("segment")
    segs = [m.segment for m in ms]
    return Response(UserSegmentSerializer(segs, many=True).data)

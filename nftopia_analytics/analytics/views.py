from django.shortcuts import render
from django.contrib.auth.decorators import login_required, user_passes_test
from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Count, Avg, Q
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import viewsets, status
from rest_framework.generics import GenericAPIView
from rest_framework.pagination import PageNumberPagination
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from marketplace.models import NFTMint, NFTSale, Collection, GasMetrics
from django.db.models import Min, Max, Avg, Sum, Count

from rest_framework.decorators import action
from .models import UserSegment, UserSegmentMembership
from .serializers import UserSegmentSerializer, UserSegmentMembershipSerializer
from users.models import User

from rest_framework.views import APIView
from rest_framework.response import Response
from .tasks import analyze_nft_metadata
from django.core.cache import cache


# --- DRF Analytics Endpoints ---





class AnalyzeMetadataView(APIView):
    @method_decorator(cache_page(60*15))  # Cache for 15 minutes
    def get(self, request, cid):
        from .models import NFTMetadata
        try:
            result = analyze_nft_metadata.delay(cid)
            analysis = result.get(timeout=30)  # Wait for result with timeout
            nft_meta = NFTMetadata.objects.get(id=analysis)
            return Response({
                'status': 'success',
                'data': {
                    'metadata': nft_meta.raw_metadata,
                    'analysis': {
                        'content_type': nft_meta.content_type,
                        'authenticity_score': nft_meta.authenticity_score,
                        'copyright_risk': nft_meta.copyright_risk
                    }
                }
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

class TimeFilterMixin:
    """Mixin to filter queryset by ?range=7d, 30d, etc."""
    def get_time_range(self, request):
        range_param = request.GET.get("range", "7d")
        if not isinstance(range_param, str):
            raise ValueError("range parameter must be a string like '7d' or '24h'")
        if range_param.endswith("d"):
            try:
                days = int(range_param[:-1])
                if days < 1 or days > 365:
                    raise ValueError("range days must be between 1 and 365")
                return timezone.now() - timedelta(days=days)
            except Exception:
                raise ValueError("Invalid range format. Use e.g. '7d' for 7 days.")
        if range_param.endswith("h"):
            try:
                hours = int(range_param[:-1])
                if hours < 1 or hours > 24*31:
                    raise ValueError("range hours must be between 1 and 744")
                return timezone.now() - timedelta(hours=hours)
            except Exception:
                raise ValueError("Invalid range format. Use e.g. '24h' for 24 hours.")
        raise ValueError("Invalid range parameter. Use e.g. '7d' or '24h'.")


class MintingAnalyticsView(TimeFilterMixin, GenericAPIView):
    """
    get:
    Returns minting analytics with timeframe filter, collection aggregation, and gas fee stats.
    Query params: range=7d, collection_id
    """
    pagination_class = PageNumberPagination

    @method_decorator(cache_page(60*5))  # cache for 5 minutes
    def get(self, request):
        try:
            since = self.get_time_range(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        qs = NFTMint.objects.all()
        if since:
            qs = qs.filter(timestamp__gte=since)
        collection_id = request.GET.get("collection_id")
        if collection_id:
            if not collection_id.isdigit():
                return Response({"error": "collection_id must be an integer"}, status=400)
            qs = qs.filter(collection_id=collection_id)
        # Aggregation by collection
        collection_stats = qs.values("collection__id", "collection__name").annotate(
            total_mints=Count("id"),
            avg_gas_price=Avg("gas_price"),
            min_gas_price=Min("gas_price"),
            max_gas_price=Max("gas_price"),
            avg_mint_price=Avg("mint_price"),
        ).order_by("-total_mints")
        # Gas fee stats (overall)
        gas_stats = qs.aggregate(
            avg_gas_price=Avg("gas_price"),
            min_gas_price=Min("gas_price"),
            max_gas_price=Max("gas_price"),
        )
        # Paginate raw mints
        page = self.paginate_queryset(qs.order_by("-timestamp"))
        mints = [
            {
                "id": mint.id,
                "timestamp": mint.timestamp,
                "collection": mint.collection.name,
                "gas_price": mint.gas_price,
                "mint_price": mint.mint_price,
            }
            for mint in page
        ] if page is not None else []
        return self.get_paginated_response({
            "collection_stats": list(collection_stats),
            "gas_stats": gas_stats,
            "results": mints,
        })


class SalesAnalyticsView(TimeFilterMixin, GenericAPIView):
    """
    get:
    Returns sales analytics: price distribution, volume trends, top collections.
    Query params: range=7d, collection_id, top_collections=5, interval=hourly/daily
    """
    pagination_class = PageNumberPagination

    @method_decorator(cache_page(60*5))
    def get(self, request):
        try:
            since = self.get_time_range(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        qs = NFTSale.objects.all()
        if since:
            qs = qs.filter(timestamp__gte=since)
        collection_id = request.GET.get("collection_id")
        if collection_id:
            if not collection_id.isdigit():
                return Response({"error": "collection_id must be an integer"}, status=400)
            qs = qs.filter(collection_id=collection_id)
        # Price distribution
        price_stats = qs.aggregate(
            min_price=Min("sale_price"),
            max_price=Max("sale_price"),
            avg_price=Avg("sale_price"),
        )
        # Volume trends
        interval = request.GET.get("interval", "daily")
        if interval not in ("hourly", "daily"):
            return Response({"error": "interval must be 'hourly' or 'daily'"}, status=400)
        time_trunc = "hour" if interval == "hourly" else "day"
        volume_trends = (
            qs.extra(select={"period": f"date_trunc('{time_trunc}', timestamp)"})
            .values("period")
            .annotate(
                total_volume=Sum("sale_price"),
                sales_count=Count("id"),
            )
            .order_by("period")
        )
        # Top collections
        top_collections_param = request.GET.get("top_collections", "5")
        try:
            top_n = int(top_collections_param)
            if top_n < 1 or top_n > 50:
                raise ValueError
        except Exception:
            return Response({"error": "top_collections must be an integer between 1 and 50"}, status=400)
        top_collections = (
            qs.values("collection__id", "collection__name")
            .annotate(total_sales=Count("id"), total_volume=Sum("sale_price"))
            .order_by("-total_volume")[:top_n]
        )
        # Paginate raw sales
        page = self.paginate_queryset(qs.order_by("-timestamp"))
        sales = [
            {
                "id": sale.id,
                "timestamp": sale.timestamp,
                "collection": sale.collection.name,
                "sale_price": sale.sale_price,
            }
            for sale in page
        ] if page is not None else []
        return self.get_paginated_response({
            "price_stats": price_stats,
            "volume_trends": list(volume_trends),
            "top_collections": list(top_collections),
            "results": sales,
        })


class UserAnalyticsView(TimeFilterMixin, GenericAPIView):
    """
    get:
    Returns user analytics: active user counts, wallet connection trends, retention metrics.
    Query params: range=7d
    """
    pagination_class = None

    @method_decorator(cache_page(60*5))
    def get(self, request):
        try:
            since = self.get_time_range(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        # Active users
        user_sessions = UserSession.objects.all()
        if since:
            user_sessions = user_sessions.filter(login_at__gte=since)
        active_users = user_sessions.values("user").distinct().count()
        # Wallet connection trends
        wallet_qs = WalletConnection.objects.all()
        if since:
            wallet_qs = wallet_qs.filter(attempted_at__gte=since)
        wallet_trends = (
            wallet_qs.extra(select={"day": "date(attempted_at)"})
            .values("day")
            .annotate(
                total=Count("id"),
                successful=Count("id", filter=Q(connection_status="success")),
                failed=Count("id", filter=Q(connection_status="failed")),
            )
            .order_by("day")
        )
        # Retention metrics
        retention = RetentionCohort.objects.all().order_by("-cohort_date", "period_number")[:30]
        retention_data = [
            {
                "cohort_date": r.cohort_date,
                "period_type": r.period_type,
                "period_number": r.period_number,
                "retention_rate": float(r.retention_rate),
                "retained_users": r.retained_users,
                "total_users": r.total_users,
            }
            for r in retention
        ]
        return Response({
            "active_users": active_users,
            "wallet_trends": list(wallet_trends),
            "retention": retention_data,
        })
from .models import (
    UserSession,
    RetentionCohort,
    WalletConnection,
    UserBehaviorMetrics,
    PageView,
)
from .utils import (
    calculate_retention_cohorts,
    get_wallet_analytics,
    get_session_analytics,
    get_user_segmentation,
)
from apps.cache.redis_utils import cache_response


def is_staff_user(user):
    """Check if user is staff"""
    return user.is_staff


# Combined decorator for JWT and staff check
def jwt_staff_required(view_func):
    """
    Decorator that combines JWT authentication and staff permission check
    Returns:
        401 Unauthorized for invalid/missing JWT
        403 Forbidden for non-staff users
    """

    @api_view(["GET"])
    @permission_classes([IsAuthenticated])
    @user_passes_test(is_staff_user)
    def wrapped_view(request, *args, **kwargs):
        return view_func(request, *args, **kwargs)

    return wrapped_view


@jwt_staff_required
def analytics_dashboard(request):
    """Main analytics dashboard view"""
    # Get recent analytics data
    session_data = get_session_analytics(days=30)
    wallet_data = get_wallet_analytics()
    user_segments = get_user_segmentation()

    # Get recent activity
    recent_sessions = UserSession.objects.select_related("user").order_by("-login_at")[
        :10
    ]
    recent_connections = WalletConnection.objects.select_related("user").order_by(
        "-attempted_at"
    )[:10]

    context = {
        "session_data": session_data,
        "wallet_data": wallet_data,
        "user_segments": user_segments,
        "recent_sessions": recent_sessions,
        "recent_connections": recent_connections,
    }

    return render(request, "analytics/dashboard.html", context)


@jwt_staff_required
def retention_analysis(request):
    """Retention analysis view"""
    period_type = request.GET.get("period", "weekly")

    # Calculate retention cohorts
    calculate_retention_cohorts(period_type)

    # Get retention data
    cohorts = RetentionCohort.objects.filter(period_type=period_type).order_by(
        "-cohort_date", "period_number"
    )

    # Group by cohort date
    cohort_data = {}
    for cohort in cohorts:
        date_key = cohort.cohort_date.strftime("%Y-%m-%d")
        if date_key not in cohort_data:
            cohort_data[date_key] = []
        cohort_data[date_key].append(
            {
                "period": cohort.period_number,
                "retention_rate": float(cohort.retention_rate),
                "retained_users": cohort.retained_users,
                "total_users": cohort.total_users,
            }
        )

    context = {
        "period_type": period_type,
        "cohort_data": cohort_data,
    }

    return render(request, "analytics/retention.html", context)


@jwt_staff_required
def wallet_trends(request):
    """Wallet trends analysis view"""
    wallet_data = get_wallet_analytics()

    # Get connection trends over time
    days = int(request.GET.get("days", 30))
    start_date = timezone.now() - timedelta(days=days)

    daily_connections = (
        WalletConnection.objects.filter(attempted_at__gte=start_date)
        .extra(select={"day": "date(attempted_at)"})
        .values("day")
        .annotate(
            total=Count("id"),
            successful=Count("id", filter=Q(connection_status="success")),
            failed=Count("id", filter=Q(connection_status="failed")),
        )
        .order_by("day")
    )

    context = {
        "wallet_data": wallet_data,
        "daily_connections": list(daily_connections),
        "days": days,
    }

    return render(request, "analytics/wallet_trends.html", context)


@jwt_staff_required
def user_behavior(request):
    """User behavior analysis view"""
    user_segments = get_user_segmentation()

    # Get top pages
    top_pages = (
        PageView.objects.values("path")
        .annotate(view_count=Count("id"), unique_users=Count("user", distinct=True))
        .order_by("-view_count")[:20]
    )

    # Get user journey data
    user_journeys = (
        PageView.objects.filter(
            user__isnull=False, timestamp__gte=timezone.now() - timedelta(days=7)
        )
        .select_related("user")
        .order_by("user", "timestamp")
    )

    context = {
        "user_segments": user_segments,
        "top_pages": top_pages,
        "user_journeys": user_journeys[:100],  # Limit for performance
    }

    return render(request, "analytics/user_behavior.html", context)


# API endpoints for AJAX requests
@cache_response(timeout=3600)  # 1 hour cache
@api_view(["GET"])
@permission_classes([IsAuthenticated])
@user_passes_test(is_staff_user)
def api_session_data(request):
    """API endpoint for session data"""
    days = int(request.GET.get("days", 30))
    data = get_session_analytics(days)
    return Response(data)


@cache_response(timeout=3600)  # 1 hour cache
@api_view(["GET"])
@permission_classes([IsAuthenticated])
@user_passes_test(is_staff_user)
def api_wallet_data(request):
    """API endpoint for wallet data"""
    data = get_wallet_analytics()
    return Response(data)


@cache_response(timeout=3600)  # 1 hour cache
@api_view(["GET"])
@permission_classes([IsAuthenticated])
@user_passes_test(is_staff_user)
def api_user_segments(request):
    """API endpoint for user segmentation data"""
    data = get_user_segmentation()
    return Response(data)


@api_view(["POST"])
def track_wallet_connection(request):
    """API endpoint to track wallet connections"""
    try:
        if request.user.is_authenticated:
            WalletConnection.objects.create(
                user=request.user,
                wallet_provider=request.data.get("provider", "other"),
                wallet_address=request.data.get("address", ""),
                connection_status=request.data.get("status", "failed"),
                error_message=request.data.get("error", ""),
                ip_address=request.META.get("REMOTE_ADDR", ""),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )

            # Update user behavior metrics
            if hasattr(request.user, "behavior_metrics"):
                request.user.behavior_metrics.update_metrics()

            return Response({"status": "success"})
        return Response(
            {"status": "error", "message": "User not authenticated"},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    except Exception as e:
        return Response(
            {"status": "error", "message": str(e)}, status=status.HTTP_400_BAD_REQUEST
        )

class UserSegmentViewSet(viewsets.ModelViewSet):
    queryset = UserSegment.objects.filter(is_active=True)
    serializer_class = UserSegmentSerializer

    @action(detail=True, methods=['get'])
    def users(self, request, pk=None):
        segment = self.get_object()
        members = segment.members.all()
        serializer = UserSegmentMembershipSerializer(members, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def evaluate_rules(self, request):
        # Implement rule evaluation logic here
        pass

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        segment = self.get_object()
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{segment.name}_users.csv"'

        writer = csv.writer(response)
        writer.writerow(['User ID', 'Username', 'Email', 'Date Joined Segment'])

        for membership in segment.members.all():
            writer.writerow([
                membership.user.id,
                membership.user.username,
                membership.user.email,
                membership.joined_at
            ])

        return response

class UserSegmentationView(viewsets.ViewSet):
    @action(detail=True, methods=['get'])
    def segments(self, request, pk=None):
        user = User.objects.get(pk=pk)
        memberships = user.segments.all()
        serializer = UserSegmentMembershipSerializer(memberships, many=True)
        return Response(serializer.data)
from django.utils import timezone
from django.db.models import Count, Avg, Q
from datetime import datetime, timedelta
from .models import UserSession, RetentionCohort, WalletConnection, UserBehaviorMetrics
import requests



def determine_content_type(metadata):
    # Implement actual content type detection
    if 'image' in metadata:
        return 'image'
    elif 'animation_url' in metadata:
        return 'video'
    return 'unknown'

def check_authenticity(metadata):
    # Implement actual checks
    return 0.8  # Example score

def detect_copyright_issues(metadata):
    # Implement actual checks
    return False

def check_standardization(metadata):
    # Check against standards like ERC-721
    issues = []
    if 'name' not in metadata:
        issues.append("Missing name field")
    return issues or None


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


def get_geographic_region(ip_address):
    """Get geographic region from IP address (optional implementation)"""
    # This is a placeholder - you can integrate with services like:
    # - ipapi.co
    # - ipgeolocation.io
    # - MaxMind GeoIP2

    try:
        # Example with ipapi.co (free tier)
        response = requests.get(f"https://ipapi.co/{ip_address}/json/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            return f"{data.get('city', '')}, {data.get('country_name', '')}"
    except:
        pass

    return "Unknown"


def calculate_retention_cohorts(period_type="weekly"):
    """Calculate retention cohorts for specified period"""
    today = timezone.now().date()

    if period_type == "daily":
        period_delta = timedelta(days=1)
        max_periods = 30  # Track 30 days
    elif period_type == "weekly":
        period_delta = timedelta(weeks=1)
        max_periods = 12  # Track 12 weeks
    else:  # monthly
        period_delta = timedelta(days=30)
        max_periods = 12  # Track 12 months

    # Get cohort start dates
    cohort_dates = []
    for i in range(max_periods):
        cohort_date = today - (period_delta * i)
        cohort_dates.append(cohort_date)

    for cohort_date in cohort_dates:
        # Get users who first logged in during this cohort period
        cohort_end = cohort_date + period_delta

        cohort_users = UserBehaviorMetrics.objects.filter(
            first_login__date__gte=cohort_date, first_login__date__lt=cohort_end
        ).values_list("user_id", flat=True)

        total_users = len(cohort_users)

        if total_users == 0:
            continue

        # Calculate retention for each period
        for period_num in range(1, max_periods + 1):
            period_start = cohort_date + (period_delta * period_num)
            period_end = period_start + period_delta

            if period_start > today:
                break

            # Count users who were active during this period
            retained_users = (
                UserSession.objects.filter(
                    user_id__in=cohort_users,
                    login_at__date__gte=period_start,
                    login_at__date__lt=period_end,
                )
                .values("user")
                .distinct()
                .count()
            )

            # Create or update retention cohort record
            cohort, created = RetentionCohort.objects.get_or_create(
                cohort_date=cohort_date,
                period_type=period_type,
                period_number=period_num,
                defaults={"total_users": total_users, "retained_users": retained_users},
            )

            if not created:
                cohort.total_users = total_users
                cohort.retained_users = retained_users

            cohort.calculate_retention_rate()
            cohort.save()


def get_wallet_analytics():
    """Get wallet connection analytics"""
    total_connections = WalletConnection.objects.count()
    successful_connections = WalletConnection.objects.filter(
        connection_status="success"
    ).count()
    failed_connections = WalletConnection.objects.filter(
        connection_status="failed"
    ).count()

    # Wallet provider breakdown
    provider_stats = (
        WalletConnection.objects.values("wallet_provider")
        .annotate(
            total=Count("id"),
            successful=Count("id", filter=Q(connection_status="success")),
            failed=Count("id", filter=Q(connection_status="failed")),
        )
        .order_by("-total")
    )

    # Success rate by provider
    for stat in provider_stats:
        if stat["total"] > 0:
            stat["success_rate"] = (stat["successful"] / stat["total"]) * 100
        else:
            stat["success_rate"] = 0

    return {
        "total_connections": total_connections,
        "successful_connections": successful_connections,
        "failed_connections": failed_connections,
        "overall_success_rate": (
            (successful_connections / total_connections * 100)
            if total_connections > 0
            else 0
        ),
        "provider_stats": provider_stats,
    }


def get_session_analytics(days=30):
    """Get session analytics for specified number of days"""
    start_date = timezone.now() - timedelta(days=days)

    sessions = UserSession.objects.filter(login_at__gte=start_date)

    total_sessions = sessions.count()
    unique_users = sessions.values("user").distinct().count()

    # Average session duration (only completed sessions)
    completed_sessions = sessions.filter(logout_at__isnull=False)
    avg_duration = completed_sessions.aggregate(avg_duration=Avg("session_duration"))[
        "avg_duration"
    ]

    # Daily session counts
    daily_sessions = (
        sessions.extra(select={"day": "date(login_at)"})
        .values("day")
        .annotate(session_count=Count("id"), unique_users=Count("user", distinct=True))
        .order_by("day")
    )

    return {
        "total_sessions": total_sessions,
        "unique_users": unique_users,
        "average_duration": avg_duration,
        "daily_sessions": list(daily_sessions),
    }


def get_user_segmentation():
    """Get user segmentation data"""
    total_users = UserBehaviorMetrics.objects.count()

    # New vs returning users
    new_users = UserBehaviorMetrics.objects.filter(is_returning_user=False).count()
    returning_users = UserBehaviorMetrics.objects.filter(is_returning_user=True).count()

    # User activity segments
    highly_active = UserBehaviorMetrics.objects.filter(total_sessions__gte=10).count()
    moderately_active = UserBehaviorMetrics.objects.filter(
        total_sessions__gte=3, total_sessions__lt=10
    ).count()
    low_active = UserBehaviorMetrics.objects.filter(total_sessions__lt=3).count()

    return {
        "total_users": total_users,
        "new_users": new_users,
        "returning_users": returning_users,
        "new_user_percentage": (
            (new_users / total_users * 100) if total_users > 0 else 0
        ),
        "highly_active": highly_active,
        "moderately_active": moderately_active,
        "low_active": low_active,
    }

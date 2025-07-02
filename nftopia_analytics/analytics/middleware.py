import time
from django.utils import timezone
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from .models import UserSession, PageView, UserBehaviorMetrics
from .utils import get_client_ip, get_geographic_region


class AnalyticsMiddleware:
    """Middleware to track page views and user behavior"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()

        response = self.get_response(request)

        # Calculate response time
        response_time = (time.time() - start_time) * 1000  # Convert to milliseconds

        # Track page view
        self.track_page_view(request, response, response_time)

        return response

    def track_page_view(self, request, response, response_time):
        """Track page view for analytics"""
        try:
            # Get current session if user is authenticated
            current_session = None
            if hasattr(request, "user") and request.user.is_authenticated:
                current_session = getattr(request, "current_session", None)

            PageView.objects.create(
                user=(
                    request.user
                    if hasattr(request, "user") and request.user.is_authenticated
                    else None
                ),
                session=current_session,
                path=request.path,
                method=request.method,
                response_time=response_time,
                status_code=response.status_code,
                referrer=request.META.get("HTTP_REFERER", ""),
                ip_address=get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )
        except Exception as e:
            # Log error but don't break the request
            print(f"Analytics tracking error: {e}")


@receiver(user_logged_in)
def track_user_login(sender, request, user, **kwargs):
    """Track user login and create session"""
    try:
        ip_address = get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        geographic_region = get_geographic_region(ip_address)

        # Create new session
        session = UserSession.objects.create(
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            geographic_region=geographic_region,
        )

        # Store session in request for middleware
        request.current_session = session

        # Update or create user behavior metrics
        metrics, created = UserBehaviorMetrics.objects.get_or_create(user=user)
        metrics.update_metrics()

    except Exception as e:
        print(f"Login tracking error: {e}")


@receiver(user_logged_out)
def track_user_logout(sender, request, user, **kwargs):
    """Track user logout and end session"""
    try:
        if user:
            # End the most recent active session
            active_session = (
                UserSession.objects.filter(user=user, is_active=True)
                .order_by("-login_at")
                .first()
            )

            if active_session:
                active_session.end_session()

                # Update user behavior metrics
                if hasattr(user, "behavior_metrics"):
                    user.behavior_metrics.update_metrics()

    except Exception as e:
        print(f"Logout tracking error: {e}")

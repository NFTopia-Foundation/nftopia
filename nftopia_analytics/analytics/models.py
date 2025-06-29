from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import uuid

class UserSession(models.Model):
    """Track user session activity"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    login_at = models.DateTimeField(auto_now_add=True)
    logout_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    geographic_region = models.CharField(max_length=100, blank=True)
    session_duration = models.DurationField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-login_at']
        indexes = [
            models.Index(fields=['user', 'login_at']),
            models.Index(fields=['login_at']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.login_at:%Y-%m-%d %H:%M}"

    def calculate_duration(self):
        if self.logout_at:
            self.session_duration = self.logout_at - self.login_at
        else:
            self.session_duration = timezone.now() - self.login_at
        return self.session_duration

    def end_session(self):
        self.logout_at = timezone.now()
        self.is_active = False
        self.calculate_duration()
        self.save()


class RetentionCohort(models.Model):
    """Track user retention cohorts"""
    PERIOD_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ]

    cohort_date = models.DateField()
    period_type = models.CharField(max_length=10, choices=PERIOD_CHOICES)
    total_users = models.IntegerField(default=0)
    period_number = models.IntegerField()  # Days/weeks/months since cohort start
    retained_users = models.IntegerField(default=0)
    retention_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['cohort_date', 'period_type', 'period_number']
        ordering = ['-cohort_date', 'period_number']
        indexes = [
            models.Index(fields=['cohort_date', 'period_type']),
            models.Index(fields=['period_type', 'period_number']),
        ]

    def __str__(self):
        return f"{self.period_type.title()} Cohort {self.cohort_date} - Period {self.period_number}"

    def calculate_retention_rate(self):
        if self.total_users > 0:
            self.retention_rate = (self.retained_users / self.total_users) * 100
        else:
            self.retention_rate = 0.00
        return self.retention_rate


class WalletConnection(models.Model):
    """Track wallet connection attempts and preferences"""
    WALLET_PROVIDERS = [
        ('metamask', 'MetaMask'),
        ('coinbase', 'Coinbase Wallet'),
        ('walletconnect', 'WalletConnect'),
        ('phantom', 'Phantom'),
        ('trust', 'Trust Wallet'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wallet_connections')
    wallet_provider = models.CharField(max_length=20, choices=WALLET_PROVIDERS)
    wallet_address = models.CharField(max_length=42, blank=True)
    connection_status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    attempted_at = models.DateTimeField(auto_now_add=True)
    error_message = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ['-attempted_at']
        indexes = [
            models.Index(fields=['user', 'attempted_at']),
            models.Index(fields=['wallet_provider', 'connection_status']),
            models.Index(fields=['attempted_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.wallet_provider} ({self.connection_status})"


class UserBehaviorMetrics(models.Model):
    """Aggregate user behavior metrics"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='behavior_metrics')
    first_login = models.DateTimeField()
    last_login = models.DateTimeField()
    total_sessions = models.IntegerField(default=0)
    total_session_time = models.DurationField(default=timedelta(0))
    average_session_duration = models.DurationField(default=timedelta(0))
    days_since_first_login = models.IntegerField(default=0)
    is_returning_user = models.BooleanField(default=False)
    preferred_wallet = models.CharField(max_length=20, blank=True)
    successful_wallet_connections = models.IntegerField(default=0)
    failed_wallet_connections = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_login']
        indexes = [
            models.Index(fields=['first_login']),
            models.Index(fields=['last_login']),
            models.Index(fields=['is_returning_user']),
        ]

    def __str__(self):
        return f"{self.user.username} - Behavior Metrics"

    def update_metrics(self):
        sessions = self.user.sessions.all()
        if sessions.exists():
            self.first_login = sessions.order_by('login_at').first().login_at
            self.last_login  = sessions.order_by('-login_at').first().login_at
            self.total_sessions = sessions.count()

            completed = sessions.filter(logout_at__isnull=False)
            if completed.exists():
                total_time = sum((s.calculate_duration() for s in completed), timedelta(0))
                self.total_session_time       = total_time
                self.average_session_duration = total_time / completed.count()

            self.days_since_first_login = (timezone.now().date() - self.first_login.date()).days
            self.is_returning_user = self.total_sessions > 1

            conns = self.user.wallet_connections.all()
            success = conns.filter(connection_status='success')
            if success.exists():
                counts = {}
                for c in success:
                    counts[c.wallet_provider] = counts.get(c.wallet_provider, 0) + 1
                self.preferred_wallet = max(counts, key=counts.get)
                self.successful_wallet_connections = success.count()
                self.failed_wallet_connections     = conns.filter(connection_status='failed').count()

        self.save()


class PageView(models.Model):
    """Track page views for user journey analysis"""
    user         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='page_views', null=True, blank=True)
    session      = models.ForeignKey(UserSession, on_delete=models.CASCADE, related_name='page_views', null=True, blank=True)
    path         = models.CharField(max_length=255)
    method       = models.CharField(max_length=10, default='GET')
    timestamp    = models.DateTimeField(auto_now_add=True)
    response_time= models.FloatField(null=True, blank=True)
    status_code  = models.IntegerField(default=200)
    referrer     = models.URLField(blank=True)
    ip_address   = models.GenericIPAddressField()
    user_agent   = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['path', 'timestamp']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        user_str = self.user.username if self.user else 'Anonymous'
        return f"{user_str} - {self.path} ({self.timestamp:%Y-%m-%d %H:%M})"


# ─────────────────────────────────────────────────────────────────────────────
# New segmentation models
# ─────────────────────────────────────────────────────────────────────────────

from django.contrib.postgres.fields import JSONField
from django.db import models as djm
from django.contrib.auth import get_user_model as _get_user_model

UserRef = _get_user_model()

class UserSegment(djm.Model):
    """Defines a named segment with JSON rules."""
    SEGMENT_TYPE_CHOICES = [
        ('activity_level', 'Activity Level'),
        ('holding_pattern', 'Holding Pattern'),
        ('collection_pref', 'Collection Preference'),
    ]

    name         = djm.CharField(max_length=100)
    segment_type = djm.CharField(max_length=50, choices=SEGMENT_TYPE_CHOICES)
    rules        = JSONField(help_text="e.g. {'min_txns':50} or {'holding_days__gt':7}")
    last_updated = djm.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} [{self.segment_type}]"


class UserSegmentMembership(djm.Model):
    """Many‑to‑many join: which users are in which segment."""
    user      = djm.ForeignKey(UserRef, on_delete=djm.CASCADE, related_name="segment_memberships")
    segment   = djm.ForeignKey(UserSegment, on_delete=djm.CASCADE, related_name="memberships")
    joined_at = djm.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "segment")

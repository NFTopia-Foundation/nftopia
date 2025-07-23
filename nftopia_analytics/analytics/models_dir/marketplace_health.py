from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid


class LiquidityMetrics(models.Model):
    """Track marketplace liquidity metrics"""
    
    collection = models.ForeignKey(
        'marketplace.Collection',
        on_delete=models.CASCADE,
        related_name='liquidity_metrics'
    )
    timestamp = models.DateTimeField(db_index=True)
    
    # Bid-Ask Spread Analysis
    bid_ask_spread = models.DecimalField(
        max_digits=10, 
        decimal_places=4,
        help_text="Percentage spread between highest bid and lowest ask"
    )
    avg_bid_price = models.DecimalField(max_digits=30, decimal_places=18, null=True)
    avg_ask_price = models.DecimalField(max_digits=30, decimal_places=18, null=True)
    
    # Order Book Depth
    total_bids = models.IntegerField(default=0)
    total_asks = models.IntegerField(default=0)
    bid_volume = models.DecimalField(max_digits=30, decimal_places=18, default=0)
    ask_volume = models.DecimalField(max_digits=30, decimal_places=18, default=0)
    
    # Time-to-Fill Metrics
    avg_time_to_fill = models.DurationField(null=True, blank=True)
    median_time_to_fill = models.DurationField(null=True, blank=True)
    fill_rate_24h = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Percentage of orders filled within 24 hours"
    )
    
    # Liquidity Score (0-100)
    liquidity_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['collection', 'timestamp']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['liquidity_score']),
        ]
        unique_together = ['collection', 'timestamp']
    
    def __str__(self):
        return f"Liquidity {self.collection.name} - {self.timestamp}"


class TradingActivityMetrics(models.Model):
    """Track trading activity and volume trends"""
    
    TIMEFRAME_CHOICES = [
        ('1h', '1 Hour'),
        ('4h', '4 Hours'),
        ('1d', '1 Day'),
        ('1w', '1 Week'),
        ('1m', '1 Month'),
    ]
    
    collection = models.ForeignKey(
        'marketplace.Collection',
        on_delete=models.CASCADE,
        related_name='trading_metrics',
        null=True,
        blank=True
    )
    timeframe = models.CharField(max_length=2, choices=TIMEFRAME_CHOICES)
    timestamp = models.DateTimeField(db_index=True)
    
    # Volume Metrics
    trading_volume = models.DecimalField(max_digits=30, decimal_places=18, default=0)
    volume_change_pct = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    volume_ma_7d = models.DecimalField(max_digits=30, decimal_places=18, default=0)
    volume_ma_30d = models.DecimalField(max_digits=30, decimal_places=18, default=0)
    
    # Trading Activity
    total_trades = models.IntegerField(default=0)
    unique_traders = models.IntegerField(default=0)
    active_traders_count = models.IntegerField(default=0)
    new_traders_count = models.IntegerField(default=0)
    
    # Price Metrics
    avg_trade_size = models.DecimalField(max_digits=30, decimal_places=18, default=0)
    median_trade_size = models.DecimalField(max_digits=30, decimal_places=18, default=0)
    price_volatility = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    
    # Wash Trading Detection
    suspected_wash_trades = models.IntegerField(default=0)
    wash_trading_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['collection', 'timeframe', 'timestamp']),
            models.Index(fields=['timestamp', 'timeframe']),
            models.Index(fields=['wash_trading_score']),
        ]
        unique_together = ['collection', 'timeframe', 'timestamp']
    
    def __str__(self):
        collection_name = self.collection.name if self.collection else "Global"
        return f"Trading {collection_name} - {self.timeframe} - {self.timestamp}"


class UserEngagementMetrics(models.Model):
    """Track user engagement and retention metrics"""
    
    METRIC_TYPES = [
        ('retention_30d', '30-Day Retention'),
        ('retention_60d', '60-Day Retention'),
        ('retention_90d', '90-Day Retention'),
        ('session_duration', 'Average Session Duration'),
        ('watchlist_activity', 'Watchlist Activity'),
    ]
    
    metric_type = models.CharField(max_length=20, choices=METRIC_TYPES)
    timestamp = models.DateTimeField(db_index=True)
    
    # Retention Metrics
    cohort_size = models.IntegerField(default=0)
    retained_users = models.IntegerField(default=0)
    retention_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Engagement Metrics
    avg_session_duration = models.DurationField(null=True, blank=True)
    median_session_duration = models.DurationField(null=True, blank=True)
    daily_active_users = models.IntegerField(default=0)
    weekly_active_users = models.IntegerField(default=0)
    monthly_active_users = models.IntegerField(default=0)
    
    # Collection Watchlist Trends
    total_watchlist_adds = models.IntegerField(default=0)
    total_watchlist_removes = models.IntegerField(default=0)
    net_watchlist_change = models.IntegerField(default=0)
    trending_collections_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['metric_type', 'timestamp']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['retention_rate']),
        ]
        unique_together = ['metric_type', 'timestamp']
    
    def __str__(self):
        return f"Engagement {self.get_metric_type_display()} - {self.timestamp}"


class MarketplaceHealthSnapshot(models.Model):
    """Aggregated marketplace health overview"""
    
    HEALTH_STATUS = [
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor'),
        ('critical', 'Critical'),
    ]
    
    timestamp = models.DateTimeField(db_index=True)
    
    # Overall Health Score (0-100)
    overall_health_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    health_status = models.CharField(max_length=10, choices=HEALTH_STATUS)
    
    # Component Scores
    liquidity_score = models.DecimalField(max_digits=5, decimal_places=2)
    trading_activity_score = models.DecimalField(max_digits=5, decimal_places=2)
    user_engagement_score = models.DecimalField(max_digits=5, decimal_places=2)
    
    # Key Metrics Summary
    total_24h_volume = models.DecimalField(max_digits=30, decimal_places=18, default=0)
    total_24h_trades = models.IntegerField(default=0)
    active_collections = models.IntegerField(default=0)
    daily_active_users = models.IntegerField(default=0)
    
    # Alerts and Flags
    has_liquidity_alerts = models.BooleanField(default=False)
    has_wash_trading_alerts = models.BooleanField(default=False)
    has_engagement_alerts = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['overall_health_score']),
            models.Index(fields=['health_status']),
        ]
    
    def __str__(self):
        return f"Health Snapshot {self.health_status} - {self.timestamp}"
    
    def calculate_overall_score(self):
        """Calculate weighted overall health score"""
        weights = {
            'liquidity': 0.4,
            'trading': 0.35,
            'engagement': 0.25
        }
        
        self.overall_health_score = (
            self.liquidity_score * weights['liquidity'] +
            self.trading_activity_score * weights['trading'] +
            self.user_engagement_score * weights['engagement']
        )
        
        # Determine health status
        if self.overall_health_score >= 90:
            self.health_status = 'excellent'
        elif self.overall_health_score >= 75:
            self.health_status = 'good'
        elif self.overall_health_score >= 60:
            self.health_status = 'fair'
        elif self.overall_health_score >= 40:
            self.health_status = 'poor'
        else:
            self.health_status = 'critical'
        
        return self.overall_health_score


class CollectionWatchlist(models.Model):
    """Track collection watchlist activity"""
    
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='watchlisted_collections'
    )
    collection = models.ForeignKey(
        'marketplace.Collection',
        on_delete=models.CASCADE,
        related_name='watchers'
    )
    added_at = models.DateTimeField(auto_now_add=True)
    removed_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Engagement tracking
    view_count = models.IntegerField(default=0)
    last_viewed = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['user', 'collection']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['collection', 'is_active']),
            models.Index(fields=['added_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} watching {self.collection.name}"
    
    def remove_from_watchlist(self):
        """Mark as removed from watchlist"""
        self.removed_at = timezone.now()
        self.is_active = False
        self.save()
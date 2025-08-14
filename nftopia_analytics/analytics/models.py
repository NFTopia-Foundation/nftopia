# from django.db import models
# from django.contrib.auth.models import User
# from django.utils import timezone
# from datetime import timedelta
# import uuid
# from django.db.models.signals import post_save, post_delete
# from django.dispatch import receiver
# from apps.cache.redis_utils import invalidate_analytics_cache
# from django.contrib.postgres.fields import JSONField
# from users.models import User  
# from analytics.aggregations.utils import queryset_to_dataframe

# # Import marketplace health models
# from .models_dir.marketplace_health import (
#     LiquidityMetrics,
#     TradingActivityMetrics,
#     UserEngagementMetrics,
#     MarketplaceHealthSnapshot,
#     CollectionWatchlist
# )

# class NFTEvent(models.Model):
#     event_type = models.CharField(max_length=20)  # MINT/TRANSFER/SALE
#     contract_address = models.CharField(max_length=42)
#     token_id = models.CharField(max_length=78)
#     amount = models.DecimalField(max_digits=36, decimal_places=18)
#     price = models.DecimalField(max_digits=36, decimal_places=18, null=True)
#     timestamp = models.DateTimeField()
#     from_address = models.CharField(max_length=42, blank=True)
#     to_address = models.CharField(max_length=42)
    
#     @classmethod
#     def to_dataframe(cls, **filters):
#         qs = cls.objects.filter(**filters)
#         return queryset_to_dataframe(qs)

# class NFTMetadata(models.Model):
#     ipfs_cid = models.CharField(max_length=128, unique=True)
#     raw_metadata = JSONField()
#     content_type = models.CharField(max_length=50, null=True)
#     authenticity_score = models.FloatField(null=True)
#     copyright_risk = models.BooleanField(default=False)
#     standardization_issues = models.TextField(null=True, blank=True)
#     last_analyzed = models.DateTimeField(auto_now=True)
#     created_at = models.DateTimeField(auto_now_add=True)

#     class Meta:
#         verbose_name_plural = "NFT Metadata"

#     def __str__(self):
#         return f"{self.ipfs_cid}"


# class UserSession(models.Model):
#     """Track user session activity"""

#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
#     login_at = models.DateTimeField(auto_now_add=True)
#     logout_at = models.DateTimeField(null=True, blank=True)
#     ip_address = models.GenericIPAddressField()
#     user_agent = models.TextField(blank=True)
#     geographic_region = models.CharField(max_length=100, blank=True)
#     session_duration = models.DurationField(null=True, blank=True)
#     is_active = models.BooleanField(default=True)

#     class Meta:
#         ordering = ["-login_at"]
#         indexes = [
#             models.Index(fields=["user", "login_at"]),
#             models.Index(fields=["login_at"]),
#             models.Index(fields=["is_active"]),
#         ]

#     def __str__(self):
#         return f"{self.user.username} - {self.login_at.strftime('%Y-%m-%d %H:%M')}"

#     def calculate_duration(self):
#         """Calculate session duration"""
#         if self.logout_at:
#             self.session_duration = self.logout_at - self.login_at
#         else:
#             self.session_duration = timezone.now() - self.login_at
#         return self.session_duration

#     def end_session(self):
#         """End the current session"""
#         self.logout_at = timezone.now()
#         self.is_active = False
#         self.calculate_duration()
#         self.save()


# class RetentionCohort(models.Model):
#     """Track user retention cohorts"""

#     PERIOD_CHOICES = [
#         ("daily", "Daily"),
#         ("weekly", "Weekly"),
#         ("monthly", "Monthly"),
#     ]

#     cohort_date = models.DateField()
#     period_type = models.CharField(max_length=10, choices=PERIOD_CHOICES)
#     total_users = models.IntegerField(default=0)
#     period_number = models.IntegerField()  # Days/weeks/months since cohort start
#     retained_users = models.IntegerField(default=0)
#     retention_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
#     created_at = models.DateTimeField(auto_now_add=True)

#     class Meta:
#         unique_together = ["cohort_date", "period_type", "period_number"]
#         ordering = ["-cohort_date", "period_number"]
#         indexes = [
#             models.Index(fields=["cohort_date", "period_type"]),
#             models.Index(fields=["period_type", "period_number"]),
#         ]

#     def __str__(self):
#         return f"{self.period_type.title()} Cohort {self.cohort_date} - Period {self.period_number}"

#     def calculate_retention_rate(self):
#         """Calculate retention rate percentage"""
#         if self.total_users > 0:
#             self.retention_rate = (self.retained_users / self.total_users) * 100
#         else:
#             self.retention_rate = 0.00
#         return self.retention_rate


# class WalletConnection(models.Model):
#     """Track wallet connection attempts and preferences"""

#     WALLET_PROVIDERS = [
#         ("metamask", "MetaMask"),
#         ("coinbase", "Coinbase Wallet"),
#         ("walletconnect", "WalletConnect"),
#         ("phantom", "Phantom"),
#         ("trust", "Trust Wallet"),
#         ("other", "Other"),
#     ]

#     STATUS_CHOICES = [
#         ("success", "Success"),
#         ("failed", "Failed"),
#         ("cancelled", "Cancelled"),
#     ]

#     user = models.ForeignKey(
#         User, on_delete=models.CASCADE, related_name="wallet_connections"
#     )
#     wallet_provider = models.CharField(max_length=20, choices=WALLET_PROVIDERS)
#     wallet_address = models.CharField(
#         max_length=42, blank=True
#     )  # Ethereum address length
#     connection_status = models.CharField(max_length=10, choices=STATUS_CHOICES)
#     attempted_at = models.DateTimeField(auto_now_add=True)
#     error_message = models.TextField(blank=True)
#     ip_address = models.GenericIPAddressField()
#     user_agent = models.TextField(blank=True)

#     class Meta:
#         ordering = ["-attempted_at"]
#         indexes = [
#             models.Index(fields=["user", "attempted_at"]),
#             models.Index(fields=["wallet_provider", "connection_status"]),
#             models.Index(fields=["attempted_at"]),
#         ]

#     def __str__(self):
#         return (
#             f"{self.user.username} - {self.wallet_provider} ({self.connection_status})"
#         )


# class UserBehaviorMetrics(models.Model):
#     """Aggregate user behavior metrics"""

#     user = models.OneToOneField(
#         User, on_delete=models.CASCADE, related_name="behavior_metrics"
#     )
#     first_login = models.DateTimeField()
#     last_login = models.DateTimeField()
#     total_sessions = models.IntegerField(default=0)
#     total_session_time = models.DurationField(default=timedelta(0))
#     average_session_duration = models.DurationField(default=timedelta(0))
#     days_since_first_login = models.IntegerField(default=0)
#     is_returning_user = models.BooleanField(default=False)
#     preferred_wallet = models.CharField(max_length=20, blank=True)
#     successful_wallet_connections = models.IntegerField(default=0)
#     failed_wallet_connections = models.IntegerField(default=0)
#     last_updated = models.DateTimeField(auto_now=True)

#     class Meta:
#         ordering = ["-last_login"]
#         indexes = [
#             models.Index(fields=["first_login"]),
#             models.Index(fields=["last_login"]),
#             models.Index(fields=["is_returning_user"]),
#         ]

#     def __str__(self):
#         return f"{self.user.username} - Behavior Metrics"

#     def update_metrics(self):
#         """Update user behavior metrics"""
#         sessions = self.user.sessions.all()

#         if sessions.exists():
#             self.first_login = sessions.order_by("login_at").first().login_at
#             self.last_login = sessions.order_by("-login_at").first().login_at
#             self.total_sessions = sessions.count()

#             # Calculate total session time
#             completed_sessions = sessions.filter(logout_at__isnull=False)
#             if completed_sessions.exists():
#                 total_time = sum(
#                     [s.calculate_duration() for s in completed_sessions], timedelta(0)
#                 )
#                 self.total_session_time = total_time
#                 self.average_session_duration = total_time / completed_sessions.count()

#             # Calculate days since first login
#             self.days_since_first_login = (
#                 timezone.now().date() - self.first_login.date()
#             ).days
#             self.is_returning_user = self.total_sessions > 1

#             # Update wallet preferences
#             wallet_connections = self.user.wallet_connections.filter(
#                 connection_status="success"
#             )
#             if wallet_connections.exists():
#                 # Find most used wallet provider
#                 wallet_counts = {}
#                 for connection in wallet_connections:
#                     provider = connection.wallet_provider
#                     wallet_counts[provider] = wallet_counts.get(provider, 0) + 1

#                 self.preferred_wallet = max(wallet_counts, key=wallet_counts.get)
#                 self.successful_wallet_connections = wallet_connections.count()
#                 self.failed_wallet_connections = self.user.wallet_connections.filter(
#                     connection_status="failed"
#                 ).count()

#         self.save()


# class PageView(models.Model):
#     """Track page views for user journey analysis"""

#     user = models.ForeignKey(
#         User, on_delete=models.CASCADE, related_name="page_views", null=True, blank=True
#     )
#     session = models.ForeignKey(
#         UserSession,
#         on_delete=models.CASCADE,
#         related_name="page_views",
#         null=True,
#         blank=True,
#     )
#     path = models.CharField(max_length=255)
#     method = models.CharField(max_length=10, default="GET")
#     timestamp = models.DateTimeField(auto_now_add=True)
#     response_time = models.FloatField(null=True, blank=True)  # in milliseconds
#     status_code = models.IntegerField(default=200)
#     referrer = models.URLField(blank=True)
#     ip_address = models.GenericIPAddressField()
#     user_agent = models.TextField(blank=True)

#     class Meta:
#         ordering = ["-timestamp"]
#         indexes = [
#             models.Index(fields=["user", "timestamp"]),
#             models.Index(fields=["path", "timestamp"]),
#             models.Index(fields=["timestamp"]),
#         ]

#     def __str__(self):
#         user_str = self.user.username if self.user else "Anonymous"
#         return f"{user_str} - {self.path} ({self.timestamp.strftime('%Y-%m-%d %H:%M')})"


# # Cache Invalidation Signals
# @receiver(post_save, sender=UserSession)
# @receiver(post_delete, sender=UserSession)
# @receiver(post_save, sender=WalletConnection)
# @receiver(post_delete, sender=WalletConnection)
# @receiver(post_save, sender=PageView)
# @receiver(post_delete, sender=PageView)
# def invalidate_analytics_cache_signal(sender, instance, **kwargs):
#     """
#     Signal handler to invalidate analytics cache when relevant models change
#     """
#     invalidate_analytics_cache()


# class AutomatedReport(models.Model):
#     report_type = models.CharField(choices=REPORT_TYPES)  # All 4 types included
#     frequency = models.CharField(choices=['daily', 'weekly', 'monthly'])
#     recipients = models.JSONField()  # List of emails/webhooks
#     format = models.CharField(choices=['pdf', 'csv', 'both'])
#     last_run = models.DateTimeField(null=True)
#     next_run = models.DateTimeField()  # Additional scheduling field
#     is_active = models.BooleanField(default=True)  # Additional control field
#     s3_bucket = models.CharField(max_length=255, blank=True)  # S3 integration
#     s3_prefix = models.CharField(max_length=255, blank=True)  # S3 organization
#     template_config = models.JSONField(default=dict)  # Template customization
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)
    
#     class Meta:
#         ordering = ['-created_at']
#         indexes = [
#             models.Index(fields=['report_type', 'frequency']),
#             models.Index(fields=['next_run', 'is_active']),
#         ]
    
#     def __str__(self):
#         return f"{self.get_report_type_display()} - {self.get_frequency_display()}"
    
#     def calculate_next_run(self):
#         """Calculate next run time based on frequency"""
#         if not self.last_run:
#             self.next_run = timezone.now()
#             return
        
#         if self.frequency == 'daily':
#             self.next_run = self.last_run + timedelta(days=1)
#         elif self.frequency == 'weekly':
#             self.next_run = self.last_run + timedelta(weeks=1)
#         elif self.frequency == 'monthly':
#             # Add one month
#             next_month = self.last_run.replace(day=28) + timedelta(days=4)
#             self.next_run = next_month - timedelta(days=next_month.day-1)


# class ReportExecution(models.Model):
#     """Track report execution history"""
    
#     STATUS_CHOICES = [
#         ('pending', 'Pending'),
#         ('running', 'Running'),
#         ('completed', 'Completed'),
#         ('failed', 'Failed'),
#     ]
    
#     report = models.ForeignKey(AutomatedReport, on_delete=models.CASCADE, related_name='executions')
#     status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
#     started_at = models.DateTimeField(auto_now_add=True)
#     completed_at = models.DateTimeField(null=True, blank=True)
#     error_message = models.TextField(blank=True)
    
#     # Generated files
#     pdf_file_path = models.CharField(max_length=500, blank=True)
#     csv_file_path = models.CharField(max_length=500, blank=True)
#     s3_pdf_url = models.URLField(blank=True)
#     s3_csv_url = models.URLField(blank=True)
    
#     # Metrics
#     data_points_processed = models.IntegerField(default=0)
#     recipients_notified = models.IntegerField(default=0)
    
#     class Meta:
#         ordering = ['-started_at']
    
#     def __str__(self):
#         return f"{self.report} - {self.status} - {self.started_at}"


# class ReportTemplate(models.Model):
#     """Customizable report templates"""
    
#     name = models.CharField(max_length=255)
#     report_type = models.CharField(max_length=50)
#     template_content = models.TextField()  # HTML template for PDF generation
#     css_styles = models.TextField(blank=True)  # Custom CSS for styling
#     chart_config = models.JSONField(default=dict)  # Chart configuration
#     is_default = models.BooleanField(default=False)
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)
    
#     class Meta:
#         unique_together = ['report_type', 'name']
#         ordering = ['report_type', 'name']
    
#     def __str__(self):
#         return f"{self.name} ({self.report_type})"


# class UserSegment(models.Model):
#     SEGMENT_TYPES = [
#         ('ACTIVITY', 'Activity Level'),
#         ('HOLDING', 'Holding Pattern'),
#         ('COLLECTION', 'Collection Preference'),
#         ('CUSTOM', 'Custom')
#     ]
    
#     name = models.CharField(max_length=100)
#     segment_type = models.CharField(max_length=20, choices=SEGMENT_TYPES)
#     description = models.TextField(blank=True)
#     rules = JSONField()  # Stores segmentation criteria
#     created_at = models.DateTimeField(auto_now_add=True)
#     last_updated = models.DateTimeField(auto_now=True)
#     is_active = models.BooleanField(default=True)

#     def __str__(self):
#         return f"{self.name} ({self.get_segment_type_display()})"

# class UserSegmentMembership(models.Model):
#     user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='segments')
#     segment = models.ForeignKey(UserSegment, on_delete=models.CASCADE, related_name='members')
#     joined_at = models.DateTimeField(auto_now_add=True)
#     last_evaluated = models.DateTimeField(auto_now=True)

#     class Meta:
#         unique_together = ('user', 'segment')

#     def __str__(self):
#         return f"{self.user} in {self.segment}"




#WIP

# from django.db import models

# class TimescaleModel(models.Model):
#     """
#     Abstract base model for TimescaleDB hypertables with composite primary keys
#     """
#     class Meta:
#         abstract = True
#         managed = False  # Tables are managed by TimescaleDB directly

# class NftMint(TimescaleModel):
#     id = models.UUIDField()
#     nft_id = models.UUIDField(help_text="Original NFT ID from user_service")
#     mint_time = models.DateTimeField(
#         db_index=True,
#         help_text="When the NFT was minted"
#     )
#     minter_address = models.CharField(max_length=42)
#     token_id = models.CharField(max_length=100)
#     collection_id = models.UUIDField()
#     metadata = models.JSONField(null=True, blank=True)
#     gas_used = models.DecimalField(max_digits=50, decimal_places=0, null=True)
#     block_number = models.BigIntegerField()

#     class Meta(TimescaleModel.Meta):
#         db_table = 'nftopia_analytics"."nft_mints'
#         constraints = [
#             models.UniqueConstraint(
#                 fields=['id', 'mint_time'],
#                 name='nft_mint_composite_pk'
#             )
#         ]
#         indexes = [
#             models.Index(fields=['collection_id', 'mint_time']),
#             models.Index(fields=['minter_address', 'mint_time']),
#         ]
#         verbose_name = "NFT Mint Event"

# class NftSale(TimescaleModel):
#     id = models.UUIDField()
#     transaction_id = models.UUIDField()
#     sale_time = models.DateTimeField(db_index=True)
#     nft_id = models.UUIDField()
#     seller_address = models.CharField(max_length=42)
#     buyer_address = models.CharField(max_length=42)
#     amount = models.DecimalField(max_digits=36, decimal_places=18)
#     currency = models.CharField(max_length=10, default='ETH')
#     marketplace_fee = models.DecimalField(max_digits=36, decimal_places=18, null=True)
#     royalty_amount = models.DecimalField(max_digits=36, decimal_places=18, null=True)
#     tx_hash = models.CharField(max_length=66)

#     class Meta(TimescaleModel.Meta):
#         db_table = 'nftopia_analytics"."nft_sales'
#         constraints = [
#             models.UniqueConstraint(
#                 fields=['id', 'sale_time'],
#                 name='nft_sale_composite_pk'
#             ),
#             models.UniqueConstraint(
#                 fields=['tx_hash'],
#                 name='unique_tx_hash'
#             )
#         ]
#         indexes = [
#             models.Index(fields=['nft_id', 'sale_time']),
#             models.Index(fields=['seller_address']),
#             models.Index(fields=['buyer_address']),
#         ]
#         verbose_name = "NFT Sale Event"

# class NftTransfer(TimescaleModel):
#     id = models.UUIDField()
#     transfer_time = models.DateTimeField(db_index=True)
#     nft_id = models.UUIDField()
#     from_address = models.CharField(max_length=42)
#     to_address = models.CharField(max_length=42)
#     tx_hash = models.CharField(max_length=66)
#     log_index = models.IntegerField()
#     event_type = models.CharField(
#         max_length=20,
#         choices=[
#             ('TRANSFER', 'Standard Transfer'),
#             ('MINT', 'Initial Mint'),
#             ('BURN', 'Token Burn')
#         ]
#     )

#     class Meta(TimescaleModel.Meta):
#         db_table = 'nftopia_analytics"."nft_transfers'
#         constraints = [
#             models.UniqueConstraint(
#                 fields=['id', 'transfer_time'],
#                 name='nft_transfer_composite_pk'
#             ),
#             models.UniqueConstraint(
#                 fields=['tx_hash', 'log_index'],
#                 name='unique_tx_log_combo'
#             )
#         ]
#         indexes = [
#             models.Index(fields=['nft_id', 'transfer_time']),
#             models.Index(fields=['from_address']),
#             models.Index(fields=['to_address']),
#         ]
#         verbose_name = "NFT Transfer Event"






# from django.db import models

# class TimescaleModel(models.Model):
#     """
#     Abstract base model for TimescaleDB hypertables
#     """
#     class Meta:
#         abstract = True
#         managed = False  # Tables are managed by TimescaleDB

# class NftMint(TimescaleModel):
#     id = models.UUIDField(primary_key=True)
#     nft_id = models.UUIDField(help_text="Original NFT ID from user_service")
#     mint_time = models.DateTimeField(
#         db_index=True,
#         help_text="When the NFT was minted (from nftopia_user_service.nft.created_at)"
#     )
#     minter_address = models.CharField(
#         max_length=42,
#         help_text="Wallet address of the minter"
#     )
#     token_id = models.CharField(max_length=100)
#     collection_id = models.UUIDField()
#     metadata = models.JSONField(null=True, blank=True)
#     gas_used = models.DecimalField(max_digits=50, decimal_places=0, null=True)
#     block_number = models.BigIntegerField()

#     class Meta(TimescaleModel.Meta):
#         db_table = 'nftopia_analytics"."nft_mints'
#         indexes = [
#             models.Index(fields=['collection_id', 'mint_time']),
#             models.Index(fields=['minter_address', 'mint_time']),
#         ]
#         verbose_name = "NFT Mint Event"

# class NftSale(TimescaleModel):
#     id = models.UUIDField(primary_key=True)
#     transaction_id = models.UUIDField(help_text="Original transaction ID from payment_service")
#     sale_time = models.DateTimeField(db_index=True)
#     nft_id = models.UUIDField()
#     seller_address = models.CharField(max_length=42)
#     buyer_address = models.CharField(max_length=42)
#     amount = models.DecimalField(max_digits=36, decimal_places=18)
#     currency = models.CharField(max_length=10, default='ETH')
#     marketplace_fee = models.DecimalField(max_digits=36, decimal_places=18, null=True)
#     royalty_amount = models.DecimalField(max_digits=36, decimal_places=18, null=True)
#     tx_hash = models.CharField(max_length=66, unique=True)

#     class Meta(TimescaleModel.Meta):
#         db_table = 'nftopia_analytics"."nft_sales'
#         indexes = [
#             models.Index(fields=['nft_id', 'sale_time']),
#             models.Index(fields=['seller_address', 'sale_time']),
#             models.Index(fields=['buyer_address']),
#         ]
#         verbose_name = "NFT Sale Event"

# class NftTransfer(TimescaleModel):
#     id = models.UUIDField(primary_key=True)
#     transfer_time = models.DateTimeField(db_index=True)
#     nft_id = models.UUIDField()
#     from_address = models.CharField(max_length=42)
#     to_address = models.CharField(max_length=42)
#     tx_hash = models.CharField(max_length=66)
#     log_index = models.IntegerField()
#     event_type = models.CharField(
#         max_length=20,
#         choices=[
#             ('TRANSFER', 'Standard Transfer'),
#             ('MINT', 'Initial Mint'),
#             ('BURN', 'Token Burn')
#         ]
#     )

#     class Meta(TimescaleModel.Meta):
#         db_table = 'nftopia_analytics"."nft_transfers'
#         indexes = [
#             models.Index(fields=['nft_id', 'transfer_time']),
#             models.Index(fields=['from_address', 'transfer_time']),
#             models.Index(fields=['to_address']),
#         ]
#         unique_together = [('tx_hash', 'log_index')]
#         verbose_name = "NFT Transfer Event"




# analytics/models.py
from django.db import models
import uuid

class NFTMint(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nft_id = models.UUIDField()
    owner_user_id = models.UUIDField(null=True)
    token_id = models.TextField(null=True)
    tx_hash = models.TextField(null=True)
    occurred_at = models.DateTimeField()   # hypertable time column
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nftopia_analytics"."nft_mints'   # schema-qualified table name


class NFTSale(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nft_id = models.UUIDField()
    buyer_user_id = models.UUIDField(null=True)
    seller_user_id = models.UUIDField(null=True)
    amount = models.DecimalField(max_digits=36, decimal_places=18)
    currency = models.CharField(max_length=16, default='STK')
    tx_hash = models.TextField(null=True)
    status = models.CharField(max_length=32, null=True)
    occurred_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nftopia_analytics"."nft_sales'


class NFTTransfer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nft_id = models.UUIDField()
    from_user_id = models.UUIDField(null=True)
    to_user_id = models.UUIDField(null=True)
    tx_hash = models.TextField(null=True)
    occurred_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nftopia_analytics"."nft_transfers'

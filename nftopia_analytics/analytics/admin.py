from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Avg, Count, Sum
from .models import (
    UserSession,
    RetentionCohort,
    WalletConnection,
    UserBehaviorMetrics,
    PageView,
    AutomatedReport,
    ReportExecution,
    NFTMetadata
)


@admin.register(NFTMetadata)
class NFTMetadataAdmin(admin.ModelAdmin):
    list_display = ('ipfs_cid', 'content_type', 'authenticity_score', 'copyright_risk')
    list_filter = ('content_type', 'copyright_risk')
    search_fields = ('ipfs_cid',)
    readonly_fields = ('last_analyzed', 'created_at')
    
    actions = ['reanalyze_metadata']
    
    def reanalyze_metadata(self, request, queryset):
        from .tasks import analyze_nft_metadata
        for item in queryset:
            analyze_nft_metadata.delay(item.ipfs_cid)
        self.message_user(request, f"Scheduled {queryset.count()} items for reanalysis")


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "login_at",
        "logout_at",
        "session_duration_display",
        "ip_address",
        "geographic_region",
        "is_active",
    ]
    list_filter = ["is_active", "login_at", "geographic_region"]
    search_fields = ["user__username", "user__email", "ip_address"]
    readonly_fields = ["id", "session_duration"]
    date_hierarchy = "login_at"

    def session_duration_display(self, obj):
        if obj.session_duration:
            total_seconds = int(obj.session_duration.total_seconds())
            hours, remainder = divmod(total_seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        return "Active"

    session_duration_display.short_description = "Duration"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user")


@admin.register(RetentionCohort)
class RetentionCohortAdmin(admin.ModelAdmin):
    list_display = [
        "cohort_date",
        "period_type",
        "period_number",
        "total_users",
        "retained_users",
        "retention_rate_display",
    ]
    list_filter = ["period_type", "cohort_date"]
    ordering = ["-cohort_date", "period_number"]

    def retention_rate_display(self, obj):
        color = (
            "green"
            if obj.retention_rate >= 50
            else "orange" if obj.retention_rate >= 25 else "red"
        )
        return format_html(
            '<span style="color: {};">{:.2f}%</span>', color, obj.retention_rate
        )

    retention_rate_display.short_description = "Retention Rate"


@admin.register(WalletConnection)
class WalletConnectionAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "wallet_provider",
        "connection_status",
        "attempted_at",
        "wallet_address_short",
    ]
    list_filter = ["wallet_provider", "connection_status", "attempted_at"]
    search_fields = ["user__username", "wallet_address", "wallet_provider"]
    date_hierarchy = "attempted_at"

    def wallet_address_short(self, obj):
        if obj.wallet_address:
            return f"{obj.wallet_address[:6]}...{obj.wallet_address[-4:]}"
        return "N/A"

    wallet_address_short.short_description = "Wallet Address"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user")


@admin.register(UserBehaviorMetrics)
class UserBehaviorMetricsAdmin(admin.ModelAdmin):
    list_display = [
        "user",
        "total_sessions",
        "average_session_duration_display",
        "days_since_first_login",
        "is_returning_user",
        "preferred_wallet",
    ]
    list_filter = ["is_returning_user", "preferred_wallet", "first_login"]
    search_fields = ["user__username", "user__email"]
    readonly_fields = [
        "first_login",
        "last_login",
        "total_sessions",
        "total_session_time",
        "average_session_duration",
        "days_since_first_login",
        "last_updated",
    ]

    def average_session_duration_display(self, obj):
        if obj.average_session_duration:
            total_seconds = int(obj.average_session_duration.total_seconds())
            hours, remainder = divmod(total_seconds, 3600)
            minutes, seconds = divmod(remainder, 60)
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        return "N/A"

    average_session_duration_display.short_description = "Avg Duration"

    actions = ["update_metrics"]

    def update_metrics(self, request, queryset):
        for metrics in queryset:
            metrics.update_metrics()
        self.message_user(request, f"Updated metrics for {queryset.count()} users.")

    update_metrics.short_description = "Update selected user metrics"


@admin.register(PageView)
class PageViewAdmin(admin.ModelAdmin):
    list_display = [
        "user_display",
        "path",
        "method",
        "status_code",
        "response_time",
        "timestamp",
    ]
    list_filter = ["method", "status_code", "timestamp"]
    search_fields = ["user__username", "path", "ip_address"]
    date_hierarchy = "timestamp"

    def user_display(self, obj):
        return obj.user.username if obj.user else "Anonymous"

    user_display.short_description = "User"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "session")


@admin.register(AutomatedReport)
class AutomatedReportAdmin(admin.ModelAdmin):
    list_display = ['report_type', 'frequency', 'is_active', 'last_run', 'next_run']
    list_filter = ['report_type', 'frequency', 'is_active']
    search_fields = ['report_type']
    readonly_fields = ['last_run', 'next_run']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('report_type', 'frequency', 'is_active')
        }),
        ('Distribution', {
            'fields': ('recipients', 'format')
        }),
        ('S3 Configuration', {
            'fields': ('s3_bucket', 's3_prefix'),
            'classes': ('collapse',)
        }),
        ('Template Configuration', {
            'fields': ('template_config',),
            'classes': ('collapse',)
        }),
        ('Schedule Information', {
            'fields': ('last_run', 'next_run'),
            'classes': ('collapse',)
        })
    )

@admin.register(ReportExecution)
class ReportExecutionAdmin(admin.ModelAdmin):
    list_display = ['report', 'status', 'started_at', 'completed_at', 'data_points_processed']
    list_filter = ['status', 'started_at']
    search_fields = ['report__report_type']
    readonly_fields = ['started_at', 'completed_at']
    
    fieldsets = (
        ('Execution Info', {
            'fields': ('report', 'status', 'started_at', 'completed_at')
        }),
        ('Files', {
            'fields': ('pdf_file_path', 'csv_file_path', 's3_pdf_url', 's3_csv_url')
        }),
        ('Metrics', {
            'fields': ('data_points_processed', 'recipients_notified')
        }),
        ('Error Info', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        })
    )

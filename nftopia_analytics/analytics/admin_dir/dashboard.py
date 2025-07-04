from django.contrib import admin
from django.shortcuts import render
from django.urls import path
from ..services import AnalyticsService
from ..decorators import analyst_required


@admin.register(AnalyticsDashboard)
class AnalyticsAdmin(admin.ModelAdmin):
    change_list_template = 'admin/analytics_dashboard.html'
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('metrics/', self.admin_site.admin_view(self.metrics_view)),
            path('export/', self.admin_site.admin_view(self.export_data)),
        ]
        return custom_urls + urls

    @analyst_required
    def changelist_view(self, request, extra_context=None):
        context = {
            'mint_data': AnalyticsService.get_mint_metrics(),
            'sales_data': AnalyticsService.get_sales_metrics(),
            'user_activity': AnalyticsService.get_user_activity(),
            'system_health': AnalyticsService.get_system_health()
        }
        return render(request, self.change_list_template, context)

    def metrics_view(self, request):
        # API endpoint for AJAX calls
        timeframe = request.GET.get('timeframe', '7d')
        return JsonResponse(AnalyticsService.get_metrics(timeframe))

    def export_data(self, request):
        # Handle data export
        format = request.GET.get('format', 'csv')
        data = AnalyticsService.get_export_data()
        return export_response(data, format)
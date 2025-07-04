from django.core.management.base import BaseCommand
from analytics.models import AutomatedReport, ReportTemplate
from django.utils import timezone


class Command(BaseCommand):
    help = 'Set up default automated reports'
    
    def handle(self, *args, **options):
        # Create default report templates
        default_templates = [
            {
                'name': 'Standard Trading Volume',
                'report_type': 'daily_trading_volume',
                'template_content': '<h1>Daily Trading Volume Report</h1>',
                'is_default': True
            },
            {
                'name': 'Collection Performance Standard',
                'report_type': 'weekly_collection_performance',
                'template_content': '<h1>Weekly Collection Performance</h1>',
                'is_default': True
            },
            {
                'name': 'User Activity Standard',
                'report_type': 'monthly_user_activity',
                'template_content': '<h1>Monthly User Activity Report</h1>',
                'is_default': True
            },
            {
                'name': 'Anomaly Detection Standard',
                'report_type': 'anomaly_detection_highlights',
                'template_content': '<h1>Anomaly Detection Highlights</h1>',
                'is_default': True
            }
        ]
        
        for template_data in default_templates:
            template, created = ReportTemplate.objects.get_or_create(
                name=template_data['name'],
                report_type=template_data['report_type'],
                defaults={
                    'template_content': template_data['template_content'],
                    'is_default': template_data['is_default']
                }
            )
            
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created template: {template.name}')
                )
        
        # Create default automated reports
        default_reports = [
            {
                'name': 'Daily Trading Volume Report',
                'report_type': 'daily_trading_volume',
                'frequency': 'daily',
                'format': 'both',
                'recipients': ['admin@nftopia.com'],
                'distribution_method': 'email'
            },
            {
                'name': 'Weekly Collection Performance',
                'report_type': 'weekly_collection_performance',
                'frequency': 'weekly',
                'format': 'pdf',
                'recipients': ['analytics@nftopia.com'],
                'distribution_method': 'both'
            },
            {
                'name': 'Monthly User Activity Summary',
                'report_type': 'monthly_user_activity',
                'frequency': 'monthly',
                'format': 'both',
                'recipients': ['management@nftopia.com'],
                'distribution_method': 'email'
            }
        ]
        
        for report_data in default_reports:
            report, created = AutomatedReport.objects.get_or_create(
                name=report_data['name'],
                defaults=report_data
            )
            
            if created:
                # Calculate initial next_run
                report.calculate_next_run()
                report.save()
                
                self.stdout.write(
                    self.style.SUCCESS(f'Created automated report: {report.name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS('Successfully set up default reports and templates')
        )
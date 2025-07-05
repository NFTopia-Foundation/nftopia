from django.core.management.base import BaseCommand
from analytics.models import AutomatedReport

class Command(BaseCommand):
    help = 'Set up default automated reports'
    
    def handle(self, *args, **options):
        default_reports = [
            {
                'report_type': 'daily_trading_volume',
                'frequency': 'daily',
                'recipients': ['admin@nftopia.com'],
                'format': 'both'
            },
            {
                'report_type': 'weekly_collection_performance',
                'frequency': 'weekly',
                'recipients': ['admin@nftopia.com'],
                'format': 'pdf'
            },
            {
                'report_type': 'monthly_user_activity',
                'frequency': 'monthly',
                'recipients': ['admin@nftopia.com'],
                'format': 'both'
            },
            {
                'report_type': 'anomaly_detection_highlights',
                'frequency': 'daily',
                'recipients': ['security@nftopia.com'],
                'format': 'pdf'
            }
        ]
        
        for report_data in default_reports:
            report, created = AutomatedReport.objects.get_or_create(
                report_type=report_data['report_type'],
                frequency=report_data['frequency'],
                defaults=report_data
            )
            
            if created:
                report.calculate_next_run()
                report.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Created report: {report}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Report already exists: {report}')
                )
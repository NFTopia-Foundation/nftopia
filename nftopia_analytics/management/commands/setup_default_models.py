from django.core.management.base import BaseCommand
from analytics.models import AnomalyModel
from datetime import timedelta

class Command(BaseCommand):
    help = 'Set up default anomaly detection models'
    
    def handle(self, *args, **options):
        default_models = [
            {
                'name': 'volume_spike',
                'threshold': 2.0,  # 2 standard deviations
                'lookback_window': timedelta(hours=24)
            },
            {
                'name': 'wash_trade',
                'threshold': 0.3,  # 30% address reuse threshold
                'lookback_window': timedelta(days=7)
            },
            {
                'name': 'bidding_anomaly',
                'threshold': 0.5,  # 50% rapid bidding threshold
                'lookback_window': timedelta(hours=6)
            },
            {
                'name': 'user_behavior',
                'threshold': 1.5,  # 1.5x deviation from normal behavior
                'lookback_window': timedelta(days=3)
            }
        ]
        
        created_count = 0
        
        for model_data in default_models:
            model, created = AnomalyModel.objects.get_or_create(
                name=model_data['name'],
                defaults=model_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(f"Created model: {model.get_name_display()}")
            else:
                self.stdout.write(f"Model already exists: {model.get_name_display()}")
        
        self.stdout.write(
            self.style.SUCCESS(f'Setup completed. Created {created_count} new models.')
        )

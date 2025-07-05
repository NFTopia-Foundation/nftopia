from django.core.management.base import BaseCommand
from analytics.detection_engine import AnomalyDetectionEngine

class Command(BaseCommand):
    help = 'Run anomaly detection manually'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--type',
            type=str,
            help='Specific detection type to run',
            choices=['volume_spike', 'wash_trade', 'bidding_anomaly', 'user_behavior']
        )
        parser.add_argument(
            '--collection',
            type=str,
            help='Specific collection address to analyze'
        )
        parser.add_argument(
            '--wallet',
            type=str,
            help='Specific wallet address to analyze'
        )
    
    def handle(self, *args, **options):
        engine = AnomalyDetectionEngine()
        
        kwargs = {}
        if options['collection']:
            kwargs['collection_address'] = options['collection']
        if options['wallet']:
            kwargs['wallet_address'] = options['wallet']
        
        self.stdout.write('Starting anomaly detection...')
        
        anomalies = engine.run_detection(options['type'], **kwargs)
        
        self.stdout.write(
            self.style.SUCCESS(f'Detection completed. Found {len(anomalies)} anomalies.')
        )
        
        for anomaly in anomalies:
            self.stdout.write(f"- {anomaly['type']}: {anomaly['severity']} (confidence: {anomaly['confidence']:.2f})")

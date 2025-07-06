from django.core.management.base import BaseCommand
from analytics.segmentation import SegmentationEngine

class Command(BaseCommand):
    help = 'Updates all user segments based on current rules'

    def handle(self, *args, **options):
        self.stdout.write('Updating user segments...')
        SegmentationEngine.update_all_segments()
        self.stdout.write(self.style.SUCCESS('Successfully updated segments'))
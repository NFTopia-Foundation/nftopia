from django.core.management.base import BaseCommand
from analytics.models import UserBehaviorMetrics


class Command(BaseCommand):
    help = "Update user behavior metrics for all users"

    def handle(self, *args, **options):
        self.stdout.write("Updating user behavior metrics...")

        metrics = UserBehaviorMetrics.objects.all()
        updated_count = 0

        for metric in metrics:
            metric.update_metrics()
            updated_count += 1

            if updated_count % 100 == 0:
                self.stdout.write(f"Updated {updated_count} user metrics...")

        self.stdout.write(
            self.style.SUCCESS(f"Successfully updated {updated_count} user metrics")
        )

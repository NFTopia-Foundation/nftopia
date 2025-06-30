from django.core.management.base import BaseCommand
from analytics.utils import calculate_retention_cohorts


class Command(BaseCommand):
    help = "Calculate retention cohorts for analytics"

    def add_arguments(self, parser):
        parser.add_argument(
            "--period",
            type=str,
            default="weekly",
            choices=["daily", "weekly", "monthly"],
            help="Period type for retention calculation",
        )

    def handle(self, *args, **options):
        period_type = options["period"]

        self.stdout.write(
            self.style.SUCCESS(f"Calculating {period_type} retention cohorts...")
        )

        calculate_retention_cohorts(period_type)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully calculated {period_type} retention cohorts"
            )
        )

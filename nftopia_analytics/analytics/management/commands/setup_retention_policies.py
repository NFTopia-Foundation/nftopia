from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings


class Command(BaseCommand):
    help = "Set up TimescaleDB retention policies and continuous aggregates"

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-retention",
            action="store_true",
            help="Skip retention policy creation",
        )
        parser.add_argument(
            "--skip-aggregates",
            action="store_true",
            help="Skip continuous aggregate creation",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force recreation of policies and aggregates",
        )

    def handle(self, *args, **options):
        self.stdout.write("Setting up retention policies and continuous aggregates...")

        if not options["skip_retention"]:
            self.setup_retention_policies(force=options["force"])

        if not options["skip_aggregates"]:
            self.setup_continuous_aggregates(force=options["force"])

        self.stdout.write(
            self.style.SUCCESS("Retention policies and aggregates setup completed!")
        )

    def setup_retention_policies(self, force=False):
        """Set up data retention policies"""
        self.stdout.write("Setting up retention policies...")

        timescale_settings = getattr(settings, "TIMESCALEDB_SETTINGS", {})
        retention_policies = timescale_settings.get("RETENTION_POLICIES", {})

        raw_events_retention = retention_policies.get("raw_events", "90 days")
        aggregates_retention = retention_policies.get("aggregates", "1 year")

        # Raw event tables
        raw_event_tables = [
            "marketplace_nftmint",
            "marketplace_nftsale",
            "marketplace_nfttransfer",
            "marketplace_gasmetrics",
            "analytics_pageview",
        ]

        with connection.cursor() as cursor:
            # Set retention for raw event tables
            for table in raw_event_tables:
                try:
                    if force:
                        # Remove existing policy if exists
                        cursor.execute(
                            f"""
                            SELECT remove_retention_policy('{table}', true);
                        """
                        )

                    cursor.execute(
                        f"""
                        SELECT add_retention_policy('{table}', INTERVAL '{raw_events_retention}');
                    """
                    )

                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Retention policy set for {table} ({raw_events_retention})"
                        )
                    )

                except Exception as e:
                    if "already exists" in str(e):
                        self.stdout.write(
                            self.style.WARNING(
                                f"⚠ Retention policy already exists for {table}"
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.ERROR(
                                f"✗ Failed to set retention policy for {table}: {e}"
                            )
                        )
                        continue

    def setup_continuous_aggregates(self, force=False):
        """Set up continuous aggregates for analytics"""
        self.stdout.write("Setting up continuous aggregates...")

        aggregates = [
            {
                "name": "nft_daily_stats",
                "query": """
                    SELECT 
                        time_bucket('1 day', timestamp) AS day,
                        collection_id,
                        COUNT(*) as total_mints,
                        AVG(mint_price) as avg_mint_price,
                        SUM(gas_used) as total_gas_used
                    FROM marketplace_nftmint
                    GROUP BY day, collection_id
                """,
                "refresh_policy": "1 hour",
            },
            {
                "name": "nft_sales_daily_stats",
                "query": """
                    SELECT 
                        time_bucket('1 day', timestamp) AS day,
                        collection_id,
                        sale_type,
                        COUNT(*) as total_sales,
                        AVG(sale_price) as avg_sale_price,
                        SUM(sale_price) as total_volume,
                        SUM(gas_used) as total_gas_used
                    FROM marketplace_nftsale
                    GROUP BY day, collection_id, sale_type
                """,
                "refresh_policy": "1 hour",
            },
            {
                "name": "gas_metrics_hourly",
                "query": """
                    SELECT 
                        time_bucket('1 hour', timestamp) AS hour,
                        transaction_type,
                        AVG(gas_used) as avg_gas_used,
                        AVG(gas_price) as avg_gas_price,
                        COUNT(*) as transaction_count
                    FROM marketplace_gasmetrics
                    GROUP BY hour, transaction_type
                """,
                "refresh_policy": "30 minutes",
            },
            {
                "name": "user_activity_daily",
                "query": """
                    SELECT 
                        time_bucket('1 day', login_at) AS day,
                        COUNT(DISTINCT user_id) as daily_active_users,
                        COUNT(*) as total_sessions,
                        AVG(EXTRACT(epoch FROM session_duration)) as avg_session_duration
                    FROM analytics_usersession
                    WHERE session_duration IS NOT NULL
                    GROUP BY day
                """,
                "refresh_policy": "1 hour",
            },
            {
                "name": "page_views_hourly",
                "query": """
                    SELECT 
                        time_bucket('1 hour', timestamp) AS hour,
                        path,
                        COUNT(*) as view_count,
                        COUNT(DISTINCT user_id) as unique_users,
                        AVG(response_time) as avg_response_time
                    FROM analytics_pageview
                    GROUP BY hour, path
                """,
                "refresh_policy": "30 minutes",
            },
        ]

        with connection.cursor() as cursor:
            for aggregate in aggregates:
                try:
                    if force:
                        # Drop existing aggregate if exists
                        cursor.execute(
                            f"DROP MATERIALIZED VIEW IF EXISTS {aggregate['name']} CASCADE;"
                        )

                    # Create continuous aggregate
                    cursor.execute(
                        f"""
                        CREATE MATERIALIZED VIEW {aggregate['name']}
                        WITH (timescaledb.continuous) AS
                        {aggregate['query']}
                        WITH NO DATA;
                    """
                    )

                    # Add refresh policy
                    cursor.execute(
                        f"""
                        SELECT add_continuous_aggregate_policy('{aggregate['name']}',
                            start_offset => INTERVAL '1 month',
                            end_offset => INTERVAL '1 minute',
                            schedule_interval => INTERVAL '{aggregate['refresh_policy']}');
                    """
                    )

                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Created continuous aggregate {aggregate['name']}"
                        )
                    )

                except Exception as e:
                    if "already exists" in str(e):
                        self.stdout.write(
                            self.style.WARNING(
                                f"⚠ Continuous aggregate {aggregate['name']} already exists"
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.ERROR(
                                f"✗ Failed to create aggregate {aggregate['name']}: {e}"
                            )
                        )
                        continue

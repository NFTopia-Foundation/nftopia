from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


class Command(BaseCommand):
    help = "Set up TimescaleDB extension and configure hypertables"

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-extension",
            action="store_true",
            help="Skip TimescaleDB extension creation (if already enabled)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force recreation of hypertables",
        )

    def handle(self, *args, **options):
        self.stdout.write("Setting up TimescaleDB...")

        if not options["skip_extension"]:
            self.create_extension()

        self.create_hypertables(force=options["force"])
        self.setup_compression()

        self.stdout.write(
            self.style.SUCCESS("TimescaleDB setup completed successfully!")
        )

    def create_extension(self):
        """Enable TimescaleDB extension"""
        self.stdout.write("Creating TimescaleDB extension...")

        try:
            with connection.cursor() as cursor:
                cursor.execute("CREATE EXTENSION IF NOT EXISTS timescaledb;")
                self.stdout.write(self.style.SUCCESS("✓ TimescaleDB extension enabled"))
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"✗ Failed to create TimescaleDB extension: {e}")
            )
            raise

    def create_hypertables(self, force=False):
        """Convert tables to hypertables"""
        self.stdout.write("Creating hypertables...")

        timescale_settings = getattr(settings, "TIMESCALEDB_SETTINGS", {})
        chunk_intervals = timescale_settings.get("CHUNK_TIME_INTERVAL", {})

        # Define tables to convert to hypertables
        hypertables = [
            {
                "table": "marketplace_nftmint",
                "time_column": "timestamp",
                "chunk_interval": chunk_intervals.get("nft_mints", "1 day"),
            },
            {
                "table": "marketplace_nftsale",
                "time_column": "timestamp",
                "chunk_interval": chunk_intervals.get("nft_sales", "1 day"),
            },
            {
                "table": "marketplace_nfttransfer",
                "time_column": "timestamp",
                "chunk_interval": chunk_intervals.get("nft_transfers", "1 day"),
            },
            {
                "table": "marketplace_gasmetrics",
                "time_column": "timestamp",
                "chunk_interval": chunk_intervals.get("gas_metrics", "1 day"),
            },
            {
                "table": "analytics_pageview",
                "time_column": "timestamp",
                "chunk_interval": chunk_intervals.get("page_views", "1 day"),
            },
            {
                "table": "analytics_usersession",
                "time_column": "login_at",
                "chunk_interval": chunk_intervals.get("user_sessions", "7 days"),
            },
        ]

        with connection.cursor() as cursor:
            for hypertable in hypertables:
                try:
                    # Check if table exists
                    cursor.execute(
                        """
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = %s
                        );
                    """,
                        [hypertable["table"]],
                    )

                    if not cursor.fetchone()[0]:
                        self.stdout.write(
                            self.style.WARNING(
                                f"⚠ Table {hypertable['table']} does not exist, skipping..."
                            )
                        )
                        continue

                    # Check if already a hypertable
                    cursor.execute(
                        """
                        SELECT EXISTS (
                            SELECT 1 FROM timescaledb_information.hypertables 
                            WHERE hypertable_name = %s
                        );
                    """,
                        [hypertable["table"]],
                    )

                    is_hypertable = cursor.fetchone()[0]

                    if is_hypertable and not force:
                        self.stdout.write(
                            self.style.WARNING(
                                f"⚠ {hypertable['table']} is already a hypertable"
                            )
                        )
                        continue

                    if is_hypertable and force:
                        # Drop hypertable first
                        cursor.execute(
                            f"SELECT drop_hypertable('{hypertable['table']}', true);"
                        )
                        self.stdout.write(
                            f"✓ Dropped existing hypertable {hypertable['table']}"
                        )

                    # Create hypertable
                    cursor.execute(
                        f"""
                        SELECT create_hypertable(
                            '{hypertable['table']}', 
                            '{hypertable['time_column']}',
                            chunk_time_interval => INTERVAL '{hypertable['chunk_interval']}'
                        );
                    """
                    )

                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Created hypertable {hypertable['table']}"
                        )
                    )

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"✗ Failed to create hypertable {hypertable['table']}: {e}"
                        )
                    )
                    continue

    def setup_compression(self):
        """Set up compression policies"""
        self.stdout.write("Setting up compression policies...")

        timescale_settings = getattr(settings, "TIMESCALEDB_SETTINGS", {})
        compression_settings = timescale_settings.get("COMPRESSION", {})

        if not compression_settings.get("enabled", False):
            self.stdout.write("Compression is disabled in settings")
            return

        compress_after = compression_settings.get("compress_after", "7 days")

        # Tables to compress
        tables_to_compress = [
            "marketplace_nftmint",
            "marketplace_nftsale",
            "marketplace_nfttransfer",
            "marketplace_gasmetrics",
            "analytics_pageview",
        ]

        with connection.cursor() as cursor:
            for table in tables_to_compress:
                try:
                    # Enable compression
                    cursor.execute(f"ALTER TABLE {table} SET (timescaledb.compress);")

                    # Add compression policy
                    cursor.execute(
                        f"""
                        SELECT add_compression_policy('{table}', INTERVAL '{compress_after}');
                    """
                    )

                    self.stdout.write(
                        self.style.SUCCESS(f"✓ Compression enabled for {table}")
                    )

                except Exception as e:
                    # Policy might already exist
                    if "already exists" in str(e):
                        self.stdout.write(
                            self.style.WARNING(
                                f"⚠ Compression policy already exists for {table}"
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.ERROR(
                                f"✗ Failed to set compression for {table}: {e}"
                            )
                        )

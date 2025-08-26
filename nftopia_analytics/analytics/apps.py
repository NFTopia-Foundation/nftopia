# from django.apps import AppConfig
# from django.db import connection
# from django.db.models.signals import post_migrate


# def init_timescale(sender, **kwargs):
#     table_name = "transaction"  # Your existing table
#     hypertable_column = "timestamp"  # The time column for TimescaleDB

#     with connection.cursor() as cursor:
#         # Check if the table exists
#         cursor.execute("""
#             SELECT EXISTS (
#                 SELECT FROM information_schema.tables 
#                 WHERE table_name = %s
#             );
#         """, [table_name])
#         exists = cursor.fetchone()[0]

#         if exists:
#             # Convert to hypertable if not already done
#             cursor.execute(f"""
#                 SELECT create_hypertable('{table_name}', '{hypertable_column}', if_not_exists => TRUE);
#             """)
#             print(f"✅ Timescale hypertable created for '{table_name}' on '{hypertable_column}'")
#         else:
#             print(f"⚠ Table '{table_name}' does not exist yet. Skipping Timescale init.")


# class AnalyticsConfig(AppConfig):
#     default_auto_field = "django.db.models.BigAutoField"
#     name = "analytics"

#     def ready(self):
#         # Run once, after *all* migrations
#         post_migrate.connect(init_timescale, sender=self)


from django.apps import AppConfig
from django.db import connection
from django.db.models.signals import post_migrate


def init_timescale(sender, **kwargs):
    table_name = "transaction"  # Your existing table
    hypertable_column = "timestamp"  # The time column for TimescaleDB

    with connection.cursor() as cursor:
        # Check if the table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = %s
            );
        """, [table_name])
        exists = cursor.fetchone()[0]

        if exists:
            # Convert to hypertable if not already done
            cursor.execute(f"""
                SELECT create_hypertable('{table_name}', '{hypertable_column}', if_not_exists => TRUE);
            """)
            print(f"✅ Timescale hypertable created for '{table_name}' on '{hypertable_column}'")
        else:
            print(f"⚠ Table '{table_name}' does not exist yet. Skipping Timescale init.")


class AnalyticsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "analytics"

    def ready(self):
        # ✅ ensure Timescale hypertable setup runs after migrations
        post_migrate.connect(init_timescale, sender=self)

        # ✅ import signals so Kafka producers get registered
        import analytics.signals  # noqa: F401

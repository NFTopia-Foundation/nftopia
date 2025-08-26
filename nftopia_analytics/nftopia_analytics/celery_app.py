# """
# Celery configuration for nftopia_analytics
# Key features:
# - Lazy configuration to avoid Django setup issues
# - Redis as default broker with connection pool
# - Error handling for worker processes
# - Beat schedule configuration to avoid circular imports
# """
# import os
# from celery import Celery
# from celery.signals import worker_process_init, worker_process_shutdown

# # Set the default Django settings module
# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nftopia_analytics.settings')

# app = Celery('nftopia_analytics')

# # Configure Celery using Django settings
# app.config_from_object('django.conf:settings', namespace='CELERY')

# # Additional Celery configuration
# app.conf.update(
#     worker_prefetch_multiplier=4,
#     task_acks_late=True,
#     broker_connection_retry_on_startup=True,
#     task_default_retry_delay=60,
#     task_time_limit=300,
#     task_soft_time_limit=240,
# )

# # Configure beat schedule here to avoid circular import with settings.py
# # This replaces the crontab import that was causing the circular dependency
# app.conf.beat_schedule = {
#     'update_analytics': {
#         'task': 'analytics.tasks.update_analytics',
#         'schedule': 15 * 60,  # Every 15 minutes (900 seconds)
#     },
# }

# # Ensure beat scheduler runs in UTC timezone
# app.conf.timezone = 'UTC'

# # Load task modules from all registered Django apps
# app.autodiscover_tasks()

# @worker_process_init.connect
# def configure_worker(sender=None, conf=None, **kwargs):
#     """Initialize worker-specific settings"""
#     pass

# @worker_process_shutdown.connect
# def shutdown_worker(sender=None, pid=None, exitcode=None, **kwargs):
#     """Cleanup when worker terminates"""
#     pass

# # Optional: If crontab-style scheduling is needed later, uncomment this function
# # def setup_crontab_schedule():
# #     """
# #     Alternative function to set up crontab-style scheduling
# #     Call this only after Django is fully initialized
# #     """
# #     try:
# #         from celery.schedules import crontab
# #         app.conf.beat_schedule = {
# #             'update_analytics': {
# #                 'task': 'analytics.tasks.update_analytics',  
# #                 'schedule': crontab(minute='*/15'),  # Every 15 minutes
# #             },
# #         }
# #     except ImportError:
# #         # Fallback to seconds-based scheduling if crontab import fails
# #         pass

# # Celery app instance for use in other modules
# __all__ = ['app']
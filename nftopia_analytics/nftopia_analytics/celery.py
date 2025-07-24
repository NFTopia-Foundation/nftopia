"""
Celery configuration for nftopia_analytics

Key features:
- Lazy configuration to avoid Django setup issues
- Redis as default broker with connection pool
- Error handling for worker processes
"""

import os
from celery import Celery
from celery.signals import worker_process_init, worker_process_shutdown

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nftopia_analytics.settings')

app = Celery('nftopia_analytics')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.conf.update(
    worker_prefetch_multiplier=4,
    task_acks_late=True,
    broker_connection_retry_on_startup=True,
    task_default_retry_delay=60,
    task_time_limit=300,
    task_soft_time_limit=240,
)

# Load task modules from all registered Django apps
app.autodiscover_tasks()

@worker_process_init.connect
def configure_worker(sender=None, conf=None, **kwargs):
    """Initialize worker-specific settings"""
    pass

@worker_process_shutdown.connect
def shutdown_worker(sender=None, pid=None, exitcode=None, **kwargs):
    """Cleanup when worker terminates"""
    pass
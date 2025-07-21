import os
from celery import Celery
from celery.signals import worker_process_init
from monitoring.exporters import update_celery_metrics




os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nftopia_analytics.settings')
app = Celery('nftopia_analytics')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


# Periodic metric updates
app.conf.beat_schedule = {
    'update-metrics': {
        'task': 'monitoring.tasks.update_metrics',
        'schedule': 15.0,
    },
}
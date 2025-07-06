import os
from celery import Celery
@worker_process_init.connect
def start_metrics_server(**kwargs):
    start_http_server(8001)  # Expose on port 8001

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nftopia_analytics.settings')
app = Celery('nftopia_analytics')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

from monitoring.exporters import update_celery_metrics
from celery.signals import worker_process_init



# Periodic metric updates
app.conf.beat_schedule = {
    'update-metrics': {
        'task': 'monitoring.tasks.update_metrics',
        'schedule': 15.0,
    },
}
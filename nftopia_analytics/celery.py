import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nftopia_analytics.settings')
app = Celery('nftopia_analytics')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
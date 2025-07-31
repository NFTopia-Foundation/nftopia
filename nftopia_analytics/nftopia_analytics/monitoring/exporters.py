from prometheus_client import Gauge
from celery import current_app

# Database metrics
DB_CONNECTIONS = Gauge(
    'django_db_connections',
    'Active database connections'
)

# Celery metrics
CELERY_TASKS = Gauge(
    'celery_running_tasks',
    'Currently executing tasks'
)

def update_celery_metrics():
    inspect = current_app.control.inspect()
    active = inspect.active() or {}
    CELERY_TASKS.set(sum(len(tasks) for tasks in active.values()))
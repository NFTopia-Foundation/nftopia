"""
Package initialization for nftopia_analytics

Exports the Celery app instance to make it available when
the package is imported. This follows Django-Celery best practices.
"""

# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
from .celery_app import app as celery_app

__all__ = ('celery_app',)  # Allows 'from nftopia_analytics import celery_app'
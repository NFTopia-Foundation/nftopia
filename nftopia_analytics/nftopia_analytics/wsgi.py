"""
WSGI config for nftopia_analytics project.

It exposes the WSGI callable as a module-level variable named ``application``.
Modified to include production-ready enhancements:
- Added path manipulation to ensure project is in Python path
- Added Sentry integration (commented out as optional)
- Explicit environment variable setting

For more information see:
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
import sys
from pathlib import Path

# Add project directory to Python path - ensures imports work consistently
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

# Set default environment before importing Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nftopia_analytics.settings")


from django.core.wsgi import get_wsgi_application

application = get_wsgi_application()
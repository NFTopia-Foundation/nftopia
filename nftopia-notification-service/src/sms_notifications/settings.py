# Add these settings to your existing Django settings

import os
from decouple import config

# Twilio Configuration
TWILIO_ACCOUNT_SID = config('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = config('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = config('TWILIO_PHONE_NUMBER')

# SMS Rate Limiting
SMS_RATE_LIMIT = '10/h'  # 10 SMS per hour per user

# Celery Configuration (for async SMS sending)
CELERY_BROKER_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('REDIS_URL', default='redis://localhost:6379/0')

# Cache for rate limiting
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://localhost:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Add to INSTALLED_APPS
INSTALLED_APPS = [
    # ... your existing apps
    'sms_notifications',
]

# Django system checks for nftopia_analytics

# Validates critical configuration at startup to catch
# settings issues before they cause runtime errors.
# """

# from django.core.checks import Error, Warning, register

# @register()
# def check_redis_config(app_configs, **kwargs):
#     """Verify Redis configuration for Celery"""
#     from django.conf import settings
#     errors = []
    
#     if not hasattr(settings, 'CELERY_BROKER_URL'):
#         errors.append(
#             Error(
#                 'Celery broker URL not configured',
#                 hint='Add CELERY_BROKER_URL to settings (e.g. redis://localhost:6379/0)',
#                 id='analytics.E001',
#             )
#         )
#     return errors

# @register()
# def check_production_settings(app_configs, **kwargs):
#     """Warn about non-production settings in production"""
#     from django.conf import settings
#     warnings = []
    
#     if settings.DEBUG:
#         warnings.append(
#             Warning(
#                 'DEBUG mode is enabled',
#                 hint='Disable DEBUG in production for security',
#                 id='analytics.W001',
#             )
#         )
    
#     if not settings.SECRET_KEY or settings.SECRET_KEY == 'your-secret-key-here':
#         warnings.append(
#             Warning(
#                 'Insecure SECRET_KEY detected',
#                 hint='Generate a strong secret key for production',
#                 id='analytics.W002',
#             )
#         )
    
#     return warnings
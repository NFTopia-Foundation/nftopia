from django.apps import AppConfig
from django.db.models.signals import post_migrate


def init_timescale(sender, **kwargs):
    from django.core.management import call_command
    call_command('init_timescale')
    
class AnalyticsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "analytics"

    def ready(self):
        post_migrate.connect(init_timescale, sender=self)
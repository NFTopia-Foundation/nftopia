from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserBehaviorMetrics


@receiver(post_save, sender=User)
def create_user_behavior_metrics(sender, instance, created, **kwargs):
    """Create UserBehaviorMetrics when a new user is created"""
    if created:
        UserBehaviorMetrics.objects.get_or_create(user=instance)

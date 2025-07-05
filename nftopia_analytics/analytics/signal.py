from django.db.models.signals import post_save
from django.dispatch import receiver
from sales.models import Transaction  # Assuming transactions affect segments
from analytics.segmentation import SegmentationEngine

@receiver(post_save, sender=Transaction)
def update_segments_on_transaction(sender, instance, **kwargs):
    SegmentationEngine.update_all_segments()
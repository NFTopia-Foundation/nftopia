from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Transaction

@receiver(post_save, sender=Transaction)
def update_nft_owner(sender, instance, created, **kwargs):
    if instance.status == Transaction.Status.COMPLETED:
        instance.nft.owner = instance.buyer
        instance.nft.save()
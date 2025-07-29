from django.db.models.signals import post_save
from django.dispatch import receiver
from .models_dir import SaleEvent, MintEvent
from marketplace.models import Collection, NFT

@receiver(post_save, sender=SaleEvent)
def update_nft_sale_stats(sender, instance, **kwargs):
    """Update denormalized stats on NFT model"""
    nft = instance.nft
    nft.last_sale_price = instance.price
    nft.last_sale_at = instance.timestamp
    nft.save(update_fields=['last_sale_price', 'last_sale_at'])

@receiver(post_save, sender=MintEvent)
def update_collection_mint_stats(sender, instance, **kwargs):
    """Update collection mint counters"""
    collection = instance.collection
    collection.total_mints = collection.mint_events.count()
    collection.save(update_fields=['total_mints'])
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import NFTMint, NFTSale, NFTTransfer
from .kafka_producer import send_event


@receiver(post_save, sender=NFTMint)
def emit_mint_event(sender, instance, created, **kwargs):
    if created:
        send_event("nft_mints", {
            "id": str(instance.id),
            "nft_id": str(instance.nft_id),
            "owner_user_id": str(instance.owner_user_id),
            "token_id": instance.token_id,
            "tx_hash": instance.tx_hash,
            "occurred_at": instance.occurred_at.isoformat(),
        })


@receiver(post_save, sender=NFTSale)
def emit_sale_event(sender, instance, created, **kwargs):
    if created:
        send_event("nft_sales", {
            "id": str(instance.id),
            "nft_id": str(instance.nft_id),
            "buyer_user_id": str(instance.buyer_user_id),
            "seller_user_id": str(instance.seller_user_id),
            "price": str(instance.price),
            "tx_hash": instance.tx_hash,
            "occurred_at": instance.occurred_at.isoformat(),
        })


@receiver(post_save, sender=NFTTransfer)
def emit_transfer_event(sender, instance, created, **kwargs):
    if created:
        send_event("nft_transfers", {
            "id": str(instance.id),
            "nft_id": str(instance.nft_id),
            "from_user_id": str(instance.from_user_id),
            "to_user_id": str(instance.to_user_id),
            "tx_hash": instance.tx_hash,
            "occurred_at": instance.occurred_at.isoformat(),
        })

from django.db import models
from marketplace.models import NFT
from ..models import NFTEvent

class TransferEvent(NFTEvent):
    nft = models.ForeignKey(
        NFT,
        on_delete=models.CASCADE,
        related_name='transfers'
    )
    from_address = models.CharField(max_length=42)
    to_address = models.CharField(max_length=42)
    is_internal = models.BooleanField(default=False)
    
    class Meta(NFTEvent.Meta):
        indexes = [
            models.Index(fields=['from_address', 'to_address']),
        ]
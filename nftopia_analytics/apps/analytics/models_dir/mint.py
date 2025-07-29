from django.db import models
from ....users.models import User
from marketplace.models import Collection
from ..models import NFTEvent

class MintEvent(NFTEvent):
    collection = models.ForeignKey(
        Collection,
        on_delete=models.CASCADE,
        related_name='mint_events'
    )
    minter = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='mints'
    )
    token_id = models.CharField(max_length=78)  # Supports ERC721 and ERC1155
    quantity = models.PositiveIntegerField(default=1)
    
    class Meta(NFTEvent.Meta):
        constraints = [
            models.UniqueConstraint(
                fields=['collection', 'token_id'],
                name='unique_token_mint'
            )
        ]
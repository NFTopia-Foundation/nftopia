from django.db import models
from decimal import Decimal
from marketplace.models import NFT
from ..models import NFTEvent
from django.core.validators import MinValueValidator


class SaleEvent(NFTEvent):
    CURRENCIES = [
        ('STRK', 'Starknet')
        ('ETH', 'Ethereum'),
        ('WETH', 'Wrapped ETH'),
        ('USDC', 'USD Coin'),
    ]
    
    nft = models.ForeignKey(
        NFT,
        on_delete=models.CASCADE,
        related_name='sales'
    )
    seller = models.CharField(max_length=42)  # Ethereum address
    buyer = models.CharField(max_length=42)   # Ethereum address
    price = models.DecimalField(
        max_digits=36,
        decimal_places=18,
        validators=[MinValueValidator(Decimal('0'))]
    )
    currency = models.CharField(max_length=4, choices=CURRENCIES)
    marketplace_fee = models.DecimalField(
        max_digits=36,
        decimal_places=18,
        default=Decimal('0')
    )
    
    class Meta(NFTEvent.Meta):
        indexes = [
            models.Index(fields=['nft', '-timestamp']),
        ]
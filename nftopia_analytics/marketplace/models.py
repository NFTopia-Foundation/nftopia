from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError

# Create your models here.

class Collection(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
class NFT(models.Model):
    """
    Core NFT model representing digital assets across collections
    """
    token_id = models.CharField(
        max_length=78,  # Supports ERC721 and ERC1155
        help_text="Unique identifier within the collection"
    )
    collection = models.ForeignKey(
        'marketplace.Collection',
        on_delete=models.CASCADE,
        related_name='nfts'
    )
    owner = models.CharField(
        max_length=42,  
        help_text="Current owner wallet address"
    )
    creator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_nfts'
    )
    metadata_uri = models.URLField(
        max_length=512,
        blank=True,
        help_text="URI pointing to NFT metadata"
    )
    last_sale_price = models.DecimalField(
        max_digits=36,
        decimal_places=18,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )
    last_sale_at = models.DateTimeField(
        null=True,
        blank=True
    )
    mint_date = models.DateTimeField(
        auto_now_add=True
    )
    is_listed = models.BooleanField(
        default=False
    )
    current_price = models.DecimalField(
        max_digits=36,
        decimal_places=18,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )

    class Meta:
        unique_together = [('collection', 'token_id')]
        indexes = [
            models.Index(fields=['owner']),
            models.Index(fields=['collection', 'token_id']),
            models.Index(fields=['-last_sale_at']),
        ]
        verbose_name = "NFT"
        verbose_name_plural = "NFTs"

    def clean(self):
        """Validate Ethereum address format"""
        if not self.owner.startswith('0x') or len(self.owner) != 42:
            raise ValidationError("Invalid Ethereum address format")
        
        if self.current_price and self.current_price < 0:
            raise ValidationError("Price cannot be negative")

    def __str__(self):
        return f"{self.collection.name} #{self.token_id}"

    @property
    def full_identifier(self):
        """Returns collection_address:token_id"""
        return f"{self.collection.contract_address}:{self.token_id}"

class NFTMint(models.Model):
    """Time-series data for NFT minting events"""
    token_id = models.CharField(max_length=100)
    contract_address = models.CharField(max_length=42)
    minter = models.CharField(max_length=42)  # Wallet address
    collection = models.ForeignKey(Collection, on_delete=models.CASCADE, related_name='mints')
    timestamp = models.DateTimeField(db_index=True)
    block_number = models.BigIntegerField()
    transaction_hash = models.CharField(max_length=66)
    gas_used = models.DecimalField(max_digits=20, decimal_places=0)
    gas_price = models.DecimalField(max_digits=30, decimal_places=9)  # in gwei
    mint_price = models.DecimalField(max_digits=30, decimal_places=18, null=True, blank=True)  # in ETH
    metadata_uri = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'collection']),
            models.Index(fields=['contract_address', 'timestamp']),
            models.Index(fields=['minter', 'timestamp']),
        ]

    def __str__(self):
        return f"Mint {self.token_id} - {self.timestamp}"


class NFTSale(models.Model):
    """Time-series data for NFT sale events"""
    SALE_TYPES = [
        ('DIRECT', 'Direct Sale'),
        ('AUCTION', 'Auction'),
        ('OFFER', 'Offer Accepted'),
    ]
    
    token_id = models.CharField(max_length=100)
    contract_address = models.CharField(max_length=42)
    seller = models.CharField(max_length=42)  # Wallet address
    buyer = models.CharField(max_length=42)   # Wallet address
    collection = models.ForeignKey(Collection, on_delete=models.CASCADE, related_name='sales')
    sale_type = models.CharField(max_length=10, choices=SALE_TYPES, default='DIRECT')
    timestamp = models.DateTimeField(db_index=True)
    block_number = models.BigIntegerField()
    transaction_hash = models.CharField(max_length=66)
    sale_price = models.DecimalField(max_digits=30, decimal_places=18)  # in ETH
    platform_fee = models.DecimalField(max_digits=30, decimal_places=18, default=0)
    royalty_fee = models.DecimalField(max_digits=30, decimal_places=18, default=0)
    gas_used = models.DecimalField(max_digits=20, decimal_places=0)
    gas_price = models.DecimalField(max_digits=30, decimal_places=9)  # in gwei
    marketplace = models.CharField(max_length=100, default='nftopia')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'collection']),
            models.Index(fields=['contract_address', 'timestamp']),
            models.Index(fields=['seller', 'timestamp']),
            models.Index(fields=['buyer', 'timestamp']),
            models.Index(fields=['sale_type', 'timestamp']),
        ]

    def __str__(self):
        return f"Sale {self.token_id} - {self.sale_price} ETH - {self.timestamp}"


class NFTTransfer(models.Model):
    """Time-series data for NFT transfer events"""
    TRANSFER_TYPES = [
        ('MINT', 'Mint Transfer'),
        ('SALE', 'Sale Transfer'),
        ('GIFT', 'Gift Transfer'),
        ('BURN', 'Burn Transfer'),
        ('OTHER', 'Other Transfer'),
    ]
    
    token_id = models.CharField(max_length=100)
    contract_address = models.CharField(max_length=42)
    from_address = models.CharField(max_length=42)  # 0x0 for mints
    to_address = models.CharField(max_length=42)    # 0x0 for burns
    collection = models.ForeignKey(Collection, on_delete=models.CASCADE, related_name='transfers')
    transfer_type = models.CharField(max_length=10, choices=TRANSFER_TYPES, default='OTHER')
    timestamp = models.DateTimeField(db_index=True)
    block_number = models.BigIntegerField()
    transaction_hash = models.CharField(max_length=66)
    gas_used = models.DecimalField(max_digits=20, decimal_places=0)
    gas_price = models.DecimalField(max_digits=30, decimal_places=9)  # in gwei
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['timestamp', 'collection']),
            models.Index(fields=['contract_address', 'timestamp']),
            models.Index(fields=['from_address', 'timestamp']),
            models.Index(fields=['to_address', 'timestamp']),
            models.Index(fields=['transfer_type', 'timestamp']),
        ]

    def __str__(self):
        return f"Transfer {self.token_id} - {self.transfer_type} - {self.timestamp}"


class GasMetrics(models.Model):
    TRANSACTION_TYPES = [
        ("MINT", "Mint"),
        ("TRANSFER", "Transfer"),
        ("SALE_DIRECT", "Sale - Direct"),
        ("SALE_AUCTION", "Sale - Auction"),
    ]
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    gas_used = models.DecimalField(max_digits=20, decimal_places=0)
    gas_price = models.DecimalField(max_digits=30, decimal_places=9)  # in gwei
    timestamp = models.DateTimeField()
    collection = models.ForeignKey(Collection, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return f"{self.transaction_type} - {self.timestamp}"

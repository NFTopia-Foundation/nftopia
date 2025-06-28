from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class Collection(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


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

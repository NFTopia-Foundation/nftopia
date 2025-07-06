from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from decimal import Decimal
from django.utils.translation import gettext_lazy as _
import uuid
from django.core.validators import RegexValidator


class SalesEvent(models.Model):
    """Model to track NFT sales events"""
    
    # NFT Details
    token_id = models.CharField(max_length=100, db_index=True)
    contract_address = models.CharField(max_length=42, db_index=True)
    
    # Sale Details
    seller_address = models.CharField(max_length=42, db_index=True)
    buyer_address = models.CharField(max_length=42, db_index=True)
    sale_price = models.DecimalField(max_digits=20, decimal_places=18)
    currency = models.CharField(max_length=10, default='ETH')
    
    # Transaction Details
    transaction_hash = models.CharField(max_length=66, unique=True)
    block_number = models.BigIntegerField(db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    gas_used = models.BigIntegerField(null=True, blank=True)
    gas_price = models.DecimalField(max_digits=20, decimal_places=18, null=True, blank=True)
    
    # Marketplace Details
    marketplace = models.CharField(max_length=50, blank=True, null=True)
    marketplace_fee = models.DecimalField(max_digits=20, decimal_places=18, default=0)
    royalty_fee = models.DecimalField(max_digits=20, decimal_places=18, default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sales_events'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['contract_address', 'timestamp']),
            models.Index(fields=['seller_address', 'timestamp']),
            models.Index(fields=['buyer_address', 'timestamp']),
            models.Index(fields=['marketplace', 'timestamp']),
        ]
    
    def clean(self):
        """Validate model data"""
        if self.sale_price <= 0:
            raise ValidationError("Sale price must be greater than 0")
        
        if self.marketplace_fee < 0:
            raise ValidationError("Marketplace fee cannot be negative")
        
        if self.royalty_fee < 0:
            raise ValidationError("Royalty fee cannot be negative")
    
    def save(self, *args, **kwargs):
        """Override save to include validation"""
        self.clean()
        super().save(*args, **kwargs)
    
    @property
    def net_sale_price(self):
        """Calculate net sale price after fees"""
        return self.sale_price - self.marketplace_fee - self.royalty_fee
    
    @property
    def total_fees(self):
        """Calculate total fees"""
        return self.marketplace_fee + self.royalty_fee
    
    def __str__(self):
        return f"Sale {self.token_id} - {self.sale_price} {self.currency}"

class SalesAggregate(models.Model):
    """Model to store pre-computed sales aggregations for performance"""
    
    date = models.DateField(db_index=True)
    contract_address = models.CharField(max_length=42, db_index=True)
    
    # Daily aggregates
    total_sales = models.IntegerField(default=0)
    total_volume = models.DecimalField(max_digits=30, decimal_places=18, default=0)
    average_price = models.DecimalField(max_digits=20, decimal_places=18, default=0)
    min_price = models.DecimalField(max_digits=20, decimal_places=18, null=True, blank=True)
    max_price = models.DecimalField(max_digits=20, decimal_places=18, null=True, blank=True)
    unique_buyers = models.IntegerField(default=0)
    unique_sellers = models.IntegerField(default=0)
    
    # Fees
    total_marketplace_fees = models.DecimalField(max_digits=30, decimal_places=18, default=0)
    total_royalty_fees = models.DecimalField(max_digits=30, decimal_places=18, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sales_aggregates'
        unique_together = ['date', 'contract_address']
        ordering = ['-date']
    
    def __str__(self):
        return f"Sales Aggregate {self.date} - {self.contract_address[:10]}..."

# Signal handlers for cache invalidation
@receiver(post_save, sender=SalesEvent)
def invalidate_sales_cache_on_save(sender, instance, **kwargs):
    """Invalidate sales cache when new sales event is saved"""
    try:
        from apps.cache.redis_utils import invalidate_sales_cache
        invalidate_sales_cache()
    except ImportError:
        # Cache utils not available yet during initial setup
        pass
    except Exception as e:
        # Log error but don't break the save operation
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to invalidate sales cache: {str(e)}")

@receiver(post_delete, sender=SalesEvent)
def invalidate_sales_cache_on_delete(sender, instance, **kwargs):
    """Invalidate sales cache when sales event is deleted"""
    try:
        from apps.cache.redis_utils import invalidate_sales_cache
        invalidate_sales_cache()
    except ImportError:
        # Cache utils not available yet during initial setup
        pass
    except Exception as e:
        # Log error but don't break the delete operation
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to invalidate sales cache: {str(e)}")

@receiver(post_save, sender=SalesAggregate)
def invalidate_sales_cache_on_aggregate_save(sender, instance, **kwargs):
    """Invalidate sales cache when sales aggregate is updated"""
    try:
        from apps.cache.redis_utils import invalidate_sales_cache
        invalidate_sales_cache()
    except ImportError:
        pass
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to invalidate sales cache on aggregate save: {str(e)}")

@receiver(post_delete, sender=SalesAggregate)
def invalidate_sales_cache_on_aggregate_delete(sender, instance, **kwargs):
    """Invalidate sales cache when sales aggregate is deleted"""
    try:
        from apps.cache.redis_utils import invalidate_sales_cache
        invalidate_sales_cache()
    except ImportError:
        pass
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to invalidate sales cache on aggregate delete: {str(e)}")



class Transaction(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', _('Pending')
        COMPLETED = 'completed', _('Completed')
        FAILED = 'failed', _('Failed')

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    buyer = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='purchases',
        verbose_name=_('buyer')
    )
    seller = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='sales',
        verbose_name=_('seller')
    )
    nft = models.ForeignKey(
        'nfts.NFT',
        on_delete=models.PROTECT,
        related_name='transactions',
        verbose_name=_('NFT')
    )
    auction = models.ForeignKey(
        'auctions.Auction',
        on_delete=models.PROTECT,
        related_name='transactions',
        null=True,
        blank=True,
        verbose_name=_('auction')
    )
    amount = models.DecimalField(
        _('amount'),
        max_digits=36,
        decimal_places=18
    )
    transaction_hash = models.CharField(
        _('transaction hash'),
        max_length=66,
        unique=True,
        validators=[
            RegexValidator(
                regex='^0x[a-fA-F0-9]{64}$',
                message='Transaction hash must be a valid Starknet transaction hash'
            )
        ]
    )

    status = models.CharField(
        _('status'),
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING
    )
    timestamp = models.DateTimeField(
        _('timestamp'),
        auto_now_add=True
    )

    class Meta:
        verbose_name = _('transaction')
        verbose_name_plural = _('transactions')
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['transaction_hash']),
            models.Index(fields=['status']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"TX {self.transaction_hash[:10]}... ({self.amount})"
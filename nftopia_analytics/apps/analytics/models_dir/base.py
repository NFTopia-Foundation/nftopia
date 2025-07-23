from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError

class NFTEvent(models.Model):
    tx_hash = models.CharField(max_length=66, unique=True)
    block_number = models.PositiveIntegerField(db_index=True)
    timestamp = models.DateTimeField(db_index=True)
    gas_used = models.DecimalField(max_digits=50, decimal_places=0)
    gas_price = models.DecimalField(max_digits=50, decimal_places=18)
    
    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=['-timestamp']),
        ]
        
    def clean(self):
        """Validate blockchain-specific constraints"""
        if not self.tx_hash.startswith('0x'):
            raise ValidationError("Transaction hash must start with 0x")
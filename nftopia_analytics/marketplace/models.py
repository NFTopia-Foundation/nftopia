from django.db import models

# Create your models here.

class Collection(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

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

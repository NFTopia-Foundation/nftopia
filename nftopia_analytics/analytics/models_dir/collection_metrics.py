from django.db import models
from django.core.validators import MinValueValidator

class CollectionMetrics(models.Model):
    collection = models.OneToOneField(
        'marketplace.Collection',
        on_delete=models.CASCADE,
        related_name='metrics'
    )
    timestamp = models.DateTimeField(auto_now=True)
    floor_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    daily_volume = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    unique_holders = models.PositiveIntegerField(default=0)
    avg_holding_days = models.FloatField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=['collection', 'timestamp']),
        ]
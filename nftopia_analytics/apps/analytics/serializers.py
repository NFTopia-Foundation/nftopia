from rest_framework import serializers
from decimal import Decimal

class AnalyticsResponseSerializer(serializers.Serializer):
    """
    Serializer for NFT analytics response data
    """
    total_volume = serializers.DecimalField(
        max_digits=36,
        decimal_places=18,
        help_text="Total trading volume in ETH"
    )
    transaction_count = serializers.IntegerField(
        min_value=0,
        help_text="Number of transactions in period"
    )
    average_price = serializers.DecimalField(
        max_digits=36,
        decimal_places=18,
        help_text="Average NFT price in ETH"
    )
    floor_price = serializers.DecimalField(
        max_digits=36,
        decimal_places=18,
        required=False,
        help_text="Current collection floor price"
    )
    timeframe = serializers.CharField(
        help_text="Analytics period (7D, 30D, ALL)"
    )
    collection_address = serializers.CharField(
        help_text="Contract address of the NFT collection"
    )
    last_updated = serializers.DateTimeField(
        help_text="When data was last refreshed"
    )

    def validate_total_volume(self, value):
        if value < Decimal('0'):
            raise serializers.ValidationError("Volume cannot be negative")
        return value
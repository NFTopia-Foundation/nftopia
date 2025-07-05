from rest_framework import serializers

class TimeframeSerializer(serializers.Serializer):
    timeframe = serializers.ChoiceField(
        choices=['24h', '7d', '30d'],
        default='7d',
        required=False
    )
    theme = serializers.ChoiceField(
        choices=['dark', 'light'],
        default='dark',
        required=False
    )
    refresh = serializers.BooleanField(
        default=False,
        required=False
    )
from rest_framework import serializers
from .models import Collection, GasMetrics

class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = '__all__'

class GasMetricsSerializer(serializers.ModelSerializer):
    collection = CollectionSerializer(read_only=True)
    class Meta:
        model = GasMetrics
        fields = '__all__' 
from rest_framework import serializers
from ..models_dir.rarity_analysis import (
    NFTTrait,
    NFTRarityScore,
    CollectionRarityMetrics,
    RarityAnalysisJob
)
from marketplace.models import Collection, NFT


class NFTTraitSerializer(serializers.ModelSerializer):
    """Serializer for NFT traits"""
    
    class Meta:
        model = NFTTrait
        fields = [
            'id', 'trait_type', 'trait_value', 'rarity_score',
            'frequency', 'frequency_percentage', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NFTRarityScoreSerializer(serializers.ModelSerializer):
    """Serializer for NFT rarity scores"""
    
    nft_token_id = serializers.CharField(source='nft.token_id', read_only=True)
    collection_name = serializers.CharField(source='nft.collection.name', read_only=True)
    collection_id = serializers.IntegerField(source='nft.collection.id', read_only=True)
    
    class Meta:
        model = NFTRarityScore
        fields = [
            'id', 'nft_token_id', 'collection_name', 'collection_id',
            'total_rarity_score', 'rarity_rank', 'percentile',
            'trait_count', 'unique_trait_count', 'average_trait_rarity',
            'calculation_method', 'last_calculated', 'calculation_duration',
            'raw_trait_data', 'calculation_metadata'
        ]
        read_only_fields = [
            'id', 'last_calculated', 'calculation_duration',
            'raw_trait_data', 'calculation_metadata'
        ]


class CollectionRarityMetricsSerializer(serializers.ModelSerializer):
    """Serializer for collection rarity metrics"""
    
    collection_name = serializers.CharField(source='collection.name', read_only=True)
    collection_id = serializers.IntegerField(source='collection.id', read_only=True)
    
    class Meta:
        model = CollectionRarityMetrics
        fields = [
            'id', 'collection_name', 'collection_id',
            'total_nfts', 'nfts_with_traits', 'total_traits', 'trait_categories',
            'average_rarity_score', 'median_rarity_score', 'rarity_std_deviation',
            'rare_holders_count', 'diamond_hands_threshold',
            'rarity_price_correlation', 'price_rarity_regression',
            'last_analyzed', 'analysis_duration', 'analysis_status', 'error_message'
        ]
        read_only_fields = [
            'id', 'last_analyzed', 'analysis_duration', 'error_message'
        ]


class RarityAnalysisJobSerializer(serializers.ModelSerializer):
    """Serializer for rarity analysis jobs"""
    
    collection_name = serializers.CharField(source='collection.name', read_only=True)
    collection_id = serializers.IntegerField(source='collection.id', read_only=True)
    
    class Meta:
        model = RarityAnalysisJob
        fields = [
            'id', 'collection_name', 'collection_id', 'job_type', 'status',
            'created_at', 'started_at', 'completed_at', 'duration',
            'nfts_processed', 'nfts_with_scores', 'errors_count', 'error_details',
            'calculation_method', 'force_refresh', 'batch_size'
        ]
        read_only_fields = [
            'id', 'created_at', 'started_at', 'completed_at', 'duration',
            'nfts_processed', 'nfts_with_scores', 'errors_count', 'error_details'
        ]


class RarityAnalysisRequestSerializer(serializers.Serializer):
    """Serializer for rarity analysis requests"""
    
    collection_address = serializers.CharField(max_length=255, required=True)
    force_refresh = serializers.BooleanField(default=False)
    calculation_method = serializers.ChoiceField(
        choices=[('statistical', 'Statistical'), ('weighted', 'Weighted')],
        default='statistical'
    )
    batch_size = serializers.IntegerField(min_value=10, max_value=1000, default=100)


class RarityScoreResponseSerializer(serializers.Serializer):
    """Serializer for rarity score API responses"""
    
    success = serializers.BooleanField()
    data = serializers.DictField()
    error = serializers.CharField(required=False, allow_blank=True)
    details = serializers.CharField(required=False, allow_blank=True)


class CollectionRarityAnalysisResponseSerializer(serializers.Serializer):
    """Serializer for collection rarity analysis API responses"""
    
    success = serializers.BooleanField()
    data = serializers.DictField()
    error = serializers.CharField(required=False, allow_blank=True)
    details = serializers.CharField(required=False, allow_blank=True)


class RarityDashboardSerializer(serializers.Serializer):
    """Serializer for rarity dashboard data"""
    
    overview = serializers.DictField()
    recent_jobs = serializers.ListField(child=serializers.DictField())
    top_collections = serializers.ListField(child=serializers.DictField())
    recent_rare_nfts = serializers.ListField(child=serializers.DictField())


class RarityMetricsSerializer(serializers.Serializer):
    """Serializer for rarity analysis metrics"""
    
    job_metrics = serializers.DictField()
    performance_metrics = serializers.DictField()
    last_updated = serializers.DateTimeField()


class TraitFrequencySerializer(serializers.Serializer):
    """Serializer for trait frequency data"""
    
    trait_type = serializers.CharField()
    trait_value = serializers.CharField()
    frequency = serializers.IntegerField()
    percentage = serializers.FloatField()
    rarity_score = serializers.FloatField()


class DiamondHandsSerializer(serializers.Serializer):
    """Serializer for diamond hands data"""
    
    owner = serializers.CharField()
    rare_nfts = serializers.ListField(child=serializers.DictField())
    total_rare_nfts = serializers.IntegerField()
    average_rarity = serializers.FloatField()


class RarityPriceCorrelationSerializer(serializers.Serializer):
    """Serializer for rarity-price correlation data"""
    
    correlation = serializers.FloatField(allow_null=True)
    regression_coefficients = serializers.DictField()
    sample_size = serializers.IntegerField()


class RarityDistributionSerializer(serializers.Serializer):
    """Serializer for rarity distribution data"""
    
    average_rarity_score = serializers.FloatField()
    median_rarity_score = serializers.FloatField()
    rarity_std_deviation = serializers.FloatField()
    percentiles = serializers.DictField()


class RarityAnalysisResultSerializer(serializers.Serializer):
    """Serializer for complete rarity analysis results"""
    
    collection_id = serializers.IntegerField()
    collection_name = serializers.CharField()
    total_nfts = serializers.IntegerField()
    nfts_with_traits = serializers.IntegerField()
    total_traits = serializers.IntegerField()
    trait_categories = serializers.IntegerField()
    average_rarity_score = serializers.FloatField()
    median_rarity_score = serializers.FloatField()
    rarity_std_deviation = serializers.FloatField()
    rare_holders_count = serializers.IntegerField()
    rarity_price_correlation = serializers.FloatField(allow_null=True)
    price_rarity_regression = serializers.DictField()
    rarest_nfts = serializers.ListField(child=serializers.DictField())
    diamond_hands = serializers.ListField(child=DiamondHandsSerializer())
    last_analyzed = serializers.DateTimeField()
    analysis_status = serializers.CharField() 
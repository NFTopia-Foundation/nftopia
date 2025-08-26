# from django.db import models
# from django.core.validators import MinValueValidator, MaxValueValidator
# from django.contrib.postgres.fields import JSONField
# from marketplace.models import Collection, NFT
# import uuid


# class NFTTrait(models.Model):
#     """Store individual NFT traits for rarity analysis"""
#     nft = models.ForeignKey(NFT, on_delete=models.CASCADE, related_name='traits')
#     trait_type = models.CharField(max_length=100, help_text="Trait category (e.g., Background, Eyes)")
#     trait_value = models.CharField(max_length=255, help_text="Trait value (e.g., Blue, Laser Eyes)")
#     rarity_score = models.FloatField(
#         null=True, 
#         blank=True,
#         validators=[MinValueValidator(0), MaxValueValidator(100)],
#         help_text="Rarity score for this specific trait (0-100)"
#     )
#     frequency = models.IntegerField(
#         default=0,
#         help_text="Number of NFTs with this trait in the collection"
#     )
#     frequency_percentage = models.FloatField(
#         default=0.0,
#         validators=[MinValueValidator(0), MaxValueValidator(100)],
#         help_text="Percentage of collection with this trait"
#     )
#     created_at = models.DateTimeField(auto_now_add=True)
#     updated_at = models.DateTimeField(auto_now=True)

#     class Meta:
#         unique_together = ['nft', 'trait_type', 'trait_value']
#         indexes = [
#             models.Index(fields=['nft', 'trait_type']),
#             models.Index(fields=['trait_type', 'trait_value']),
#             models.Index(fields=['rarity_score']),
#         ]

#     def __str__(self):
#         return f"{self.nft} - {self.trait_type}: {self.trait_value}"


# class NFTRarityScore(models.Model):
#     """Store calculated rarity scores for individual NFTs"""
#     nft = models.OneToOneField(NFT, on_delete=models.CASCADE, related_name='rarity_score')
    
#     # Overall rarity metrics
#     total_rarity_score = models.FloatField(
#         validators=[MinValueValidator(0), MaxValueValidator(100)],
#         help_text="Overall rarity score (0-100)"
#     )
#     rarity_rank = models.IntegerField(
#         help_text="Rank within collection (1 = rarest)"
#     )
#     percentile = models.FloatField(
#         validators=[MinValueValidator(0), MaxValueValidator(100)],
#         help_text="Percentile rank (0-100)"
#     )
    
#     # Statistical metrics
#     trait_count = models.IntegerField(default=0, help_text="Number of traits")
#     unique_trait_count = models.IntegerField(default=0, help_text="Number of unique traits")
#     average_trait_rarity = models.FloatField(default=0.0, help_text="Average rarity of all traits")
    
#     # Metadata
#     calculation_method = models.CharField(
#         max_length=50, 
#         default='statistical',
#         help_text="Method used for rarity calculation"
#     )
#     last_calculated = models.DateTimeField(auto_now=True)
#     calculation_duration = models.FloatField(
#         null=True, 
#         blank=True,
#         help_text="Time taken for calculation in seconds"
#     )
    
#     # Raw data for debugging
#     raw_trait_data = JSONField(default=dict, help_text="Raw trait data used for calculation")
#     calculation_metadata = JSONField(default=dict, help_text="Additional calculation metadata")

#     class Meta:
#         indexes = [
#             models.Index(fields=['nft', 'total_rarity_score']),
#             models.Index(fields=['rarity_rank']),
#             models.Index(fields=['collection', 'total_rarity_score']),
#             models.Index(fields=['last_calculated']),
#         ]

#     def __str__(self):
#         return f"{self.nft} - Score: {self.total_rarity_score:.2f} (Rank: {self.rarity_rank})"

#     @property
#     def collection(self):
#         return self.nft.collection


# class CollectionRarityMetrics(models.Model):
#     """Store collection-level rarity analysis metrics"""
#     collection = models.OneToOneField(Collection, on_delete=models.CASCADE, related_name='rarity_metrics')
    
#     # Collection statistics
#     total_nfts = models.IntegerField(default=0, help_text="Total NFTs in collection")
#     nfts_with_traits = models.IntegerField(default=0, help_text="NFTs with trait data")
#     total_traits = models.IntegerField(default=0, help_text="Total unique traits")
#     trait_categories = models.IntegerField(default=0, help_text="Number of trait categories")
    
#     # Rarity distribution
#     average_rarity_score = models.FloatField(default=0.0, help_text="Average rarity score")
#     median_rarity_score = models.FloatField(default=0.0, help_text="Median rarity score")
#     rarity_std_deviation = models.FloatField(default=0.0, help_text="Standard deviation of rarity scores")
    
#     # Diamond hands detection
#     rare_holders_count = models.IntegerField(default=0, help_text="Number of holders with rare NFTs")
#     diamond_hands_threshold = models.FloatField(default=90.0, help_text="Rarity threshold for diamond hands")
    
#     # Price correlation
#     rarity_price_correlation = models.FloatField(
#         null=True, 
#         blank=True,
#         help_text="Correlation between rarity and price"
#     )
#     price_rarity_regression = JSONField(default=dict, help_text="Regression coefficients")
    
#     # Analysis metadata
#     last_analyzed = models.DateTimeField(auto_now=True)
#     analysis_duration = models.FloatField(
#         null=True, 
#         blank=True,
#         help_text="Time taken for analysis in seconds"
#     )
#     analysis_status = models.CharField(
#         max_length=20,
#         choices=[
#             ('pending', 'Pending'),
#             ('running', 'Running'),
#             ('completed', 'Completed'),
#             ('failed', 'Failed'),
#         ],
#         default='pending'
#     )
#     error_message = models.TextField(blank=True, help_text="Error message if analysis failed")

#     class Meta:
#         indexes = [
#             models.Index(fields=['collection', 'last_analyzed']),
#             models.Index(fields=['analysis_status']),
#         ]

#     def __str__(self):
#         return f"{self.collection.name} - Rarity Metrics"


# class RarityAnalysisJob(models.Model):
#     """Track rarity analysis jobs for monitoring and debugging"""
#     id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     collection = models.ForeignKey(Collection, on_delete=models.CASCADE, related_name='rarity_jobs')
    
#     # Job details
#     job_type = models.CharField(
#         max_length=20,
#         choices=[
#             ('initial', 'Initial Analysis'),
#             ('refresh', 'Refresh Analysis'),
#             ('incremental', 'Incremental Update'),
#         ]
#     )
#     status = models.CharField(
#         max_length=20,
#         choices=[
#             ('pending', 'Pending'),
#             ('running', 'Running'),
#             ('completed', 'Completed'),
#             ('failed', 'Failed'),
#             ('cancelled', 'Cancelled'),
#         ],
#         default='pending'
#     )
    
#     # Timing
#     created_at = models.DateTimeField(auto_now_add=True)
#     started_at = models.DateTimeField(null=True, blank=True)
#     completed_at = models.DateTimeField(null=True, blank=True)
#     duration = models.FloatField(null=True, blank=True, help_text="Duration in seconds")
    
#     # Results
#     nfts_processed = models.IntegerField(default=0)
#     nfts_with_scores = models.IntegerField(default=0)
#     errors_count = models.IntegerField(default=0)
#     error_details = JSONField(default=dict, help_text="Detailed error information")
    
#     # Configuration
#     calculation_method = models.CharField(max_length=50, default='statistical')
#     force_refresh = models.BooleanField(default=False)
#     batch_size = models.IntegerField(default=100)

#     class Meta:
#         ordering = ['-created_at']
#         indexes = [
#             models.Index(fields=['collection', 'status']),
#             models.Index(fields=['created_at']),
#             models.Index(fields=['status', 'created_at']),
#         ]

#     def __str__(self):
#         return f"{self.collection.name} - {self.job_type} ({self.status})"

#     def start_job(self):
#         """Mark job as started"""
#         from django.utils import timezone
#         self.status = 'running'
#         self.started_at = timezone.now()
#         self.save()

#     def complete_job(self, duration=None):
#         """Mark job as completed"""
#         from django.utils import timezone
#         self.status = 'completed'
#         self.completed_at = timezone.now()
#         if duration:
#             self.duration = duration
#         else:
#             self.duration = (self.completed_at - self.started_at).total_seconds()
#         self.save()

#     def fail_job(self, error_message=None):
#         """Mark job as failed"""
#         from django.utils import timezone
#         self.status = 'failed'
#         self.completed_at = timezone.now()
#         if self.started_at:
#             self.duration = (self.completed_at - self.started_at).total_seconds()
#         if error_message:
#             self.error_details['message'] = error_message
#         self.save() 
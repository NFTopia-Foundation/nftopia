from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .services.marketplace_health_service import MarketplaceHealthService
from .models_dir.marketplace_health import (
    LiquidityMetrics,
    TradingActivityMetrics,
    UserEngagementMetrics,
    MarketplaceHealthSnapshot
)
from marketplace.models import Collection
import logging

from .services.rarity_service import RarityAnalysisService
from .models_dir.rarity_analysis import RarityAnalysisJob
from marketplace.models import Collection

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def calculate_liquidity_metrics_task(self, collection_id=None):
    """
    Calculate and store liquidity metrics for collections
    """
    try:
        if collection_id:
            collections = [Collection.objects.get(id=collection_id)]
        else:
            collections = Collection.objects.all()[:50]  # Process top 50 collections
        
        for collection in collections:
            try:
                metrics_data = MarketplaceHealthService.calculate_liquidity_metrics(collection.id)
                
                LiquidityMetrics.objects.create(
                    collection=collection,
                    timestamp=timezone.now(),
                    bid_ask_spread=metrics_data['bid_ask_spread'],
                    avg_time_to_fill=metrics_data['avg_time_to_fill'],
                    fill_rate_24h=metrics_data['fill_rate_24h'],
                    liquidity_score=metrics_data['liquidity_score'],
                    total_bids=0,  # Would need order book data
                    total_asks=0,  # Would need order book data
                    bid_volume=0,
                    ask_volume=0
                )
                
                logger.info(f"Calculated liquidity metrics for collection {collection.name}")
                
            except Exception as e:
                logger.error(f"Error calculating liquidity for collection {collection.id}: {str(e)}")
                continue
        
        return f"Processed liquidity metrics for {len(collections)} collections"
        
    except Exception as exc:
        logger.error(f"Liquidity metrics task failed: {str(exc)}")
        raise self.retry(countdown=60, exc=exc)


@shared_task(bind=True, max_retries=3)
def calculate_trading_activity_task(self, timeframe='1d'):
    """
    Calculate and store trading activity metrics
    """
    try:
        collections = Collection.objects.all()[:50]
        
        for collection in collections:
            try:
                wash_trading_data = MarketplaceHealthService.detect_wash_trading(collection.id)
                
                TradingActivityMetrics.objects.create(
                    collection=collection,
                    timeframe=timeframe,
                    timestamp=timezone.now(),
                    trading_volume=0,  # Would calculate from sales data
                    total_trades=wash_trading_data['total_trades_analyzed'],
                    suspected_wash_trades=wash_trading_data['suspected_wash_trades'],
                    wash_trading_score=wash_trading_data['wash_trading_score']
                )
                
                logger.info(f"Calculated trading metrics for collection {collection.name}")
                
            except Exception as e:
                logger.error(f"Error calculating trading metrics for collection {collection.id}: {str(e)}")
                continue
        
        return f"Processed trading metrics for {len(collections)} collections"
        
    except Exception as exc:
        logger.error(f"Trading metrics task failed: {str(exc)}")
        raise self.retry(countdown=60, exc=exc)


@shared_task(bind=True, max_retries=3)
def calculate_user_engagement_task(self):
    """
    Calculate and store user engagement metrics
    """
    try:
        engagement_data = MarketplaceHealthService.calculate_user_engagement_metrics()
        
        # Create retention metrics
        UserEngagementMetrics.objects.create(
            metric_type='retention_30d',
            timestamp=timezone.now(),
            retention_rate=engagement_data['retention_30d'],
            daily_active_users=engagement_data['daily_active_users'],
            weekly_active_users=engagement_data['weekly_active_users'],
            monthly_active_users=engagement_data['monthly_active_users'],
            avg_session_duration=engagement_data['avg_session_duration'],
            total_watchlist_adds=engagement_data['watchlist_adds_24h'],
            total_watchlist_removes=engagement_data['watchlist_removes_24h'],
            net_watchlist_change=engagement_data['net_watchlist_change']
        )
        
        logger.info("Calculated user engagement metrics")
        return "User engagement metrics calculated successfully"
        
    except Exception as exc:
        logger.error(f"User engagement task failed: {str(exc)}")
        raise self.retry(countdown=60, exc=exc)


@shared_task(bind=True, max_retries=3)
def generate_health_snapshot_task(self):
    """
    Generate comprehensive marketplace health snapshot
    """
    try:
        snapshot = MarketplaceHealthService.generate_health_snapshot()
        
        logger.info(f"Generated health snapshot with status: {snapshot.health_status}")
        return f"Health snapshot generated: {snapshot.health_status} (Score: {snapshot.overall_health_score})"
        
    except Exception as exc:
        logger.error(f"Health snapshot task failed: {str(exc)}")
        raise self.retry(countdown=60, exc=exc)


@shared_task
def cleanup_old_metrics():
    """
    Clean up old metrics data to prevent database bloat
    """
    try:
        cutoff_date = timezone.now() - timedelta(days=90)
        
        # Clean up old liquidity metrics
        deleted_liquidity = LiquidityMetrics.objects.filter(
            timestamp__lt=cutoff_date
        ).delete()[0]
        
        # Clean up old trading metrics
        deleted_trading = TradingActivityMetrics.objects.filter(
            timestamp__lt=cutoff_date
        ).delete()[0]
        
        # Clean up old engagement metrics
        deleted_engagement = UserEngagementMetrics.objects.filter(
            timestamp__lt=cutoff_date
        ).delete()[0]
        
        # Keep health snapshots for longer (1 year)
        snapshot_cutoff = timezone.now() - timedelta(days=365)
        deleted_snapshots = MarketplaceHealthSnapshot.objects.filter(
            timestamp__lt=snapshot_cutoff
        ).delete()[0]
        
        logger.info(
            f"Cleaned up old metrics: {deleted_liquidity} liquidity, "
            f"{deleted_trading} trading, {deleted_engagement} engagement, "
            f"{deleted_snapshots} snapshots"
        )
        
        return {
            'liquidity_deleted': deleted_liquidity,
            'trading_deleted': deleted_trading,
            'engagement_deleted': deleted_engagement,
            'snapshots_deleted': deleted_snapshots
        }
        
    except Exception as e:
        logger.error(f"Cleanup task failed: {str(e)}")
        raise


# Periodic task to run all marketplace health calculations
@shared_task
def run_marketplace_health_pipeline():
    """
    Run the complete marketplace health monitoring pipeline
    """
    try:
        # Calculate metrics in sequence
        calculate_liquidity_metrics_task.delay()
        calculate_trading_activity_task.delay()
        calculate_user_engagement_task.delay()
        
        # Generate health snapshot after metrics are calculated
        generate_health_snapshot_task.apply_async(countdown=300)  # 5 minute delay
        
        logger.info("Marketplace health pipeline initiated")
        return "Marketplace health pipeline started successfully"
        
    except Exception as e:
        logger.error(f"Health pipeline failed: {str(e)}")


@shared_task(bind=True)
def process_collection_rarity_analysis(self, collection_id: int, force_refresh: bool = False):
    """
    Celery task for processing collection rarity analysis
    
    Args:
        collection_id: ID of the collection to analyze
        force_refresh: Whether to force refresh existing analysis
    """
    try:
        # Get the job
        job = RarityAnalysisJob.objects.filter(
            collection_id=collection_id,
            status='running'
        ).order_by('-created_at').first()
        
        if not job:
            # Create a new job if none exists
            collection = Collection.objects.get(id=collection_id)
            job = RarityAnalysisJob.objects.create(
                collection=collection,
                job_type='initial' if force_refresh else 'refresh',
                force_refresh=force_refresh,
                status='running'
            )
        
        # Update task state
        self.update_state(
            state='PROGRESS',
            meta={
                'collection_id': collection_id,
                'job_id': str(job.id),
                'status': 'Processing rarity analysis...'
            }
        )
        
        # Process the analysis
        rarity_service = RarityAnalysisService()
        result = rarity_service.process_collection_rarity_analysis(collection_id, force_refresh)
        
        if 'error' in result:
            # Update job with error
            job.fail_job(result['error'])
            return {
                'status': 'FAILED',
                'error': result['error'],
                'collection_id': collection_id,
                'job_id': str(job.id)
            }
        
        # Update task state
        self.update_state(
            state='SUCCESS',
            meta={
                'collection_id': collection_id,
                'job_id': str(job.id),
                'result': result
            }
        )
        
        return {
            'status': 'SUCCESS',
            'collection_id': collection_id,
            'job_id': str(job.id),
            'result': result
        }
        
    except Exception as e:
        # Update job with error
        if 'job' in locals():
            job.fail_job(str(e))
        
        return {
            'status': 'FAILED',
            'error': str(e),
            'collection_id': collection_id
        }


@shared_task
def extract_nft_traits_from_metadata(collection_id: int):
    """
    Celery task for extracting NFT traits from metadata
    
    Args:
        collection_id: ID of the collection to process
    """
    try:
        from .models_dir.rarity_analysis import NFTTrait
        from .models import NFTMetadata
        
        collection = Collection.objects.get(id=collection_id)
        nfts = collection.nfts.all()
        
        processed_count = 0
        traits_created = 0
        
        for nft in nfts:
            try:
                # Get metadata for the NFT
                metadata = NFTMetadata.objects.filter(
                    raw_metadata__contains={'token_id': nft.token_id}
                ).first()
                
                if not metadata:
                    continue
                
                # Extract traits using the service
                rarity_service = RarityAnalysisService()
                traits = rarity_service.extract_traits_from_metadata(metadata.raw_metadata)
                
                # Create trait records
                for trait_data in traits:
                    trait, created = NFTTrait.objects.update_or_create(
                        nft=nft,
                        trait_type=trait_data['trait_type'],
                        trait_value=trait_data['trait_value'],
                        defaults={
                            'rarity_score': None,  # Will be calculated later
                            'frequency': 0,  # Will be calculated later
                            'frequency_percentage': 0.0  # Will be calculated later
                        }
                    )
                    
                    if created:
                        traits_created += 1
                
                processed_count += 1
                
            except Exception as e:
                logger.error(f"Error processing NFT {nft.id}: {str(e)}")
                continue
        
        return {
            'status': 'SUCCESS',
            'collection_id': collection_id,
            'processed_nfts': processed_count,
            'traits_created': traits_created
        }
        
    except Exception as e:
        logger.error(f"Error in extract_nft_traits_from_metadata: {str(e)}")
        return {
            'status': 'FAILED',
            'error': str(e),
            'collection_id': collection_id
        }


@shared_task
def update_rarity_scores_batch(collection_id: int, batch_size: int = 100):
    """
    Celery task for updating rarity scores in batches
    
    Args:
        collection_id: ID of the collection to process
        batch_size: Number of NFTs to process per batch
    """
    try:
        from .models_dir.rarity_analysis import NFTRarityScore
        
        rarity_service = RarityAnalysisService()
        
        # Get NFTs without rarity scores
        nfts_without_scores = collection.nfts.filter(
            ~models.Exists(NFTRarityScore.objects.filter(nft=models.OuterRef('pk')))
        )
        
        total_nfts = nfts_without_scores.count()
        processed_count = 0
        scored_count = 0
        
        # Process in batches
        for i in range(0, total_nfts, batch_size):
            batch_nfts = nfts_without_scores[i:i + batch_size]
            
            # Calculate trait frequencies for the collection
            trait_frequencies = rarity_service.calculate_trait_frequencies(collection_id)
            
            for nft in batch_nfts:
                try:
                    # Calculate rarity score
                    score_data = rarity_service.calculate_nft_rarity_score(nft, trait_frequencies)
                    
                    # Save rarity score
                    rarity_score, created = NFTRarityScore.objects.update_or_create(
                        nft=nft,
                        defaults={
                            'total_rarity_score': score_data['total_rarity_score'],
                            'trait_count': score_data['trait_count'],
                            'unique_trait_count': score_data['unique_trait_count'],
                            'average_trait_rarity': score_data['average_trait_rarity'],
                            'calculation_method': 'statistical',
                            'calculation_duration': score_data['calculation_duration'],
                            'raw_trait_data': score_data.get('trait_data', [])
                        }
                    )
                    
                    scored_count += 1
                    
                except Exception as e:
                    logger.error(f"Error processing NFT {nft.id}: {str(e)}")
                
                processed_count += 1
        
        return {
            'status': 'SUCCESS',
            'collection_id': collection_id,
            'processed_nfts': processed_count,
            'scored_nfts': scored_count
        }
        
    except Exception as e:
        logger.error(f"Error in update_rarity_scores_batch: {str(e)}")
        return {
            'status': 'FAILED',
            'error': str(e),
            'collection_id': collection_id
        }


@shared_task
def cleanup_old_rarity_jobs():
    """
    Celery task for cleaning up old rarity analysis jobs
    """
    try:
        from django.utils import timezone
        from datetime import timedelta
        
        # Delete jobs older than 30 days
        cutoff_date = timezone.now() - timedelta(days=30)
        deleted_count = RarityAnalysisJob.objects.filter(
            created_at__lt=cutoff_date,
            status__in=['completed', 'failed']
        ).delete()[0]
        
        return {
            'status': 'SUCCESS',
            'deleted_jobs': deleted_count
        }
        
    except Exception as e:
        logger.error(f"Error in cleanup_old_rarity_jobs: {str(e)}")
        return {
            'status': 'FAILED',
            'error': str(e)
        }


@shared_task
def update_collection_rarity_metrics(collection_id: int):
    """
    Celery task for updating collection rarity metrics
    
    Args:
        collection_id: ID of the collection to update
    """
    try:
        from .models_dir.rarity_analysis import CollectionRarityMetrics, NFTRarityScore
        
        rarity_service = RarityAnalysisService()
        
        # Calculate distribution
        distribution = rarity_service.calculate_collection_rarity_distribution(collection_id)
        
        # Get diamond hands
        diamond_hands = rarity_service.detect_diamond_hands(collection_id)
        
        # Calculate price correlation
        price_correlation = rarity_service.calculate_rarity_price_correlation(collection_id)
        
        # Update collection metrics
        collection = Collection.objects.get(id=collection_id)
        collection_metrics, created = CollectionRarityMetrics.objects.update_or_create(
            collection=collection,
            defaults={
                'total_nfts': collection.nfts.count(),
                'nfts_with_traits': NFTRarityScore.objects.filter(nft__collection=collection).count(),
                'total_traits': rarity_service.calculate_trait_frequencies(collection_id).keys().__len__(),
                'trait_categories': len(set([k.split(':')[0] for k in rarity_service.calculate_trait_frequencies(collection_id).keys()])),
                'average_rarity_score': distribution['average_rarity_score'],
                'median_rarity_score': distribution['median_rarity_score'],
                'rarity_std_deviation': distribution['rarity_std_deviation'],
                'rare_holders_count': len(diamond_hands),
                'rarity_price_correlation': price_correlation['correlation'],
                'price_rarity_regression': price_correlation['regression_coefficients'],
                'analysis_status': 'completed'
            }
        )
        
        return {
            'status': 'SUCCESS',
            'collection_id': collection_id,
            'metrics_updated': True
        }
        
    except Exception as e:
        logger.error(f"Error in update_collection_rarity_metrics: {str(e)}")
        return {
            'status': 'FAILED',
            'error': str(e),
            'collection_id': collection_id
        }

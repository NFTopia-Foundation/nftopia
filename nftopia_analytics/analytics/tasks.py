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

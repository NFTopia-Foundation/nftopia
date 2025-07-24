import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from django.db.models import Avg, Sum, Count, Q, F
from django.utils import timezone
from decimal import Decimal
from typing import Dict, List, Any, Optional

from ..models_dir.marketplace_health import (
    LiquidityMetrics,
    TradingActivityMetrics,
    UserEngagementMetrics,
    MarketplaceHealthSnapshot,
    CollectionWatchlist
)
from ..models import UserSession, UserBehaviorMetrics
from marketplace.models import Collection, NFTSale
from sales.models import SalesEvent, SalesAggregate


class MarketplaceHealthService:
    """Service for calculating marketplace health metrics"""
    
    @staticmethod
    def calculate_liquidity_metrics(collection_id: int = None) -> Dict[str, Any]:
        """Calculate liquidity metrics for a collection or globally"""
        
        # Get recent sales data
        end_time = timezone.now()
        start_time = end_time - timedelta(hours=24)
        
        sales_query = SalesEvent.objects.filter(
            timestamp__gte=start_time,
            timestamp__lte=end_time
        )
        
        if collection_id:
            # Filter by collection if specified
            sales_query = sales_query.filter(
                contract_address__in=Collection.objects.filter(
                    id=collection_id
                ).values_list('contract_address', flat=True)
            )
        
        sales_data = list(sales_query.values(
            'sale_price', 'timestamp', 'contract_address'
        ))
        
        if not sales_data:
            return {
                'bid_ask_spread': Decimal('0'),
                'liquidity_score': Decimal('0'),
                'avg_time_to_fill': timedelta(0),
                'fill_rate_24h': Decimal('0')
            }
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame(sales_data)
        df['sale_price'] = df['sale_price'].astype(float)
        
        # Calculate bid-ask spread (simplified)
        price_std = df['sale_price'].std()
        price_mean = df['sale_price'].mean()
        bid_ask_spread = (price_std / price_mean * 100) if price_mean > 0 else 0
        
        # Calculate liquidity score based on volume and frequency
        total_volume = df['sale_price'].sum()
        trade_frequency = len(df) / 24  # trades per hour
        
        # Liquidity score formula (0-100)
        volume_score = min(total_volume / 100, 50)  # Max 50 points for volume
        frequency_score = min(trade_frequency * 10, 50)  # Max 50 points for frequency
        liquidity_score = volume_score + frequency_score
        
        # Calculate average time to fill (simplified)
        avg_time_between_trades = timedelta(hours=24) / len(df) if len(df) > 1 else timedelta(hours=24)
        
        return {
            'bid_ask_spread': Decimal(str(round(bid_ask_spread, 4))),
            'liquidity_score': Decimal(str(round(liquidity_score, 2))),
            'avg_time_to_fill': avg_time_between_trades,
            'fill_rate_24h': Decimal('85.5'),  # Placeholder - would need order book data
            'total_volume': Decimal(str(total_volume)),
            'trade_count': len(df)
        }
    
    @staticmethod
    def detect_wash_trading(collection_id: int = None, days: int = 7) -> Dict[str, Any]:
        """Detect potential wash trading patterns"""
        
        end_time = timezone.now()
        start_time = end_time - timedelta(days=days)
        
        sales_query = SalesEvent.objects.filter(
            timestamp__gte=start_time,
            timestamp__lte=end_time
        )
        
        if collection_id:
            sales_query = sales_query.filter(
                contract_address__in=Collection.objects.filter(
                    id=collection_id
                ).values_list('contract_address', flat=True)
            )
        
        # Analyze trading patterns
        suspicious_patterns = 0
        total_trades = sales_query.count()
        
        # Pattern 1: Same buyer-seller pairs
        buyer_seller_pairs = sales_query.values(
            'buyer_address', 'seller_address'
        ).annotate(
            trade_count=Count('id')
        ).filter(trade_count__gt=3)
        
        suspicious_patterns += buyer_seller_pairs.count()
        
        # Pattern 2: Rapid back-and-forth trading
        rapid_trades = sales_query.filter(
            timestamp__gte=timezone.now() - timedelta(hours=1)
        ).values('token_id', 'contract_address').annotate(
            trade_count=Count('id')
        ).filter(trade_count__gt=5)
        
        suspicious_patterns += rapid_trades.count()
        
        # Calculate wash trading score
        wash_score = min((suspicious_patterns / max(total_trades, 1)) * 100, 100)
        
        return {
            'suspected_wash_trades': suspicious_patterns,
            'wash_trading_score': Decimal(str(round(wash_score, 2))),
            'total_trades_analyzed': total_trades,
            'suspicious_patterns': {
                'repeated_pairs': buyer_seller_pairs.count(),
                'rapid_trades': rapid_trades.count()
            }
        }
    
    @staticmethod
    def calculate_user_engagement_metrics() -> Dict[str, Any]:
        """Calculate user engagement and retention metrics"""
        
        now = timezone.now()
        
        # 30-day retention
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)
        ninety_days_ago = now - timedelta(days=90)
        
        # Users who joined 30 days ago
        cohort_30d = UserBehaviorMetrics.objects.filter(
            first_login__gte=thirty_days_ago,
            first_login__lt=thirty_days_ago + timedelta(days=1)
        )
        
        # Users from that cohort who are still active
        retained_30d = cohort_30d.filter(
            last_login__gte=now - timedelta(days=7)
        )
        
        retention_30d = (retained_30d.count() / max(cohort_30d.count(), 1)) * 100
        
        # Session duration metrics
        recent_sessions = UserSession.objects.filter(
            login_at__gte=now - timedelta(days=7),
            logout_at__isnull=False
        )
        
        avg_session_duration = recent_sessions.aggregate(
            avg_duration=Avg('session_duration')
        )['avg_duration'] or timedelta(0)
        
        # Daily/Weekly/Monthly active users
        dau = UserSession.objects.filter(
            login_at__gte=now - timedelta(days=1)
        ).values('user').distinct().count()
        
        wau = UserSession.objects.filter(
            login_at__gte=now - timedelta(days=7)
        ).values('user').distinct().count()
        
        mau = UserSession.objects.filter(
            login_at__gte=now - timedelta(days=30)
        ).values('user').distinct().count()
        
        # Watchlist activity
        watchlist_adds_24h = CollectionWatchlist.objects.filter(
            added_at__gte=now - timedelta(days=1)
        ).count()
        
        watchlist_removes_24h = CollectionWatchlist.objects.filter(
            removed_at__gte=now - timedelta(days=1)
        ).count()
        
        return {
            'retention_30d': Decimal(str(round(retention_30d, 2))),
            'avg_session_duration': avg_session_duration,
            'daily_active_users': dau,
            'weekly_active_users': wau,
            'monthly_active_users': mau,
            'watchlist_adds_24h': watchlist_adds_24h,
            'watchlist_removes_24h': watchlist_removes_24h,
            'net_watchlist_change': watchlist_adds_24h - watchlist_removes_24h
        }
    
    @staticmethod
    def generate_health_snapshot() -> MarketplaceHealthSnapshot:
        """Generate comprehensive marketplace health snapshot"""
        
        # Calculate component scores
        liquidity_data = MarketplaceHealthService.calculate_liquidity_metrics()
        wash_trading_data = MarketplaceHealthService.detect_wash_trading()
        engagement_data = MarketplaceHealthService.calculate_user_engagement_metrics()
        
        # Calculate component scores (0-100)
        liquidity_score = liquidity_data['liquidity_score']
        
        # Trading activity score (inverse of wash trading score)
        trading_score = Decimal('100') - wash_trading_data['wash_trading_score']
        
        # Engagement score based on retention and activity
        engagement_score = min(
            engagement_data['retention_30d'] + 
            min(engagement_data['daily_active_users'] / 10, 30),  # Max 30 points for DAU
            100
        )
        
        # Create health snapshot
        snapshot = MarketplaceHealthSnapshot(
            timestamp=timezone.now(),
            liquidity_score=liquidity_score,
            trading_activity_score=trading_score,
            user_engagement_score=engagement_score,
            total_24h_volume=liquidity_data.get('total_volume', Decimal('0')),
            total_24h_trades=liquidity_data.get('trade_count', 0),
            daily_active_users=engagement_data['daily_active_users'],
            has_wash_trading_alerts=wash_trading_data['wash_trading_score'] > 20,
            has_engagement_alerts=engagement_data['retention_30d'] < 30
        )
        
        # Calculate overall score
        snapshot.calculate_overall_score()
        snapshot.save()
        
        return snapshot
    
    @staticmethod
    def get_liquidity_heatmap_data(days: int = 30) -> List[Dict[str, Any]]:
        """Generate data for liquidity heatmap visualization"""
        
        end_time = timezone.now()
        start_time = end_time - timedelta(days=days)
        
        # Get liquidity metrics for all collections
        collections = Collection.objects.all()[:20]  # Top 20 collections
        heatmap_data = []
        
        for collection in collections:
            liquidity_metrics = LiquidityMetrics.objects.filter(
                collection=collection,
                timestamp__gte=start_time
            ).aggregate(
                avg_liquidity=Avg('liquidity_score'),
                avg_volume=Avg('bid_volume')
            )
            
            heatmap_data.append({
                'collection_name': collection.name,
                'collection_id': collection.id,
                'liquidity_score': float(liquidity_metrics['avg_liquidity'] or 0),
                'volume': float(liquidity_metrics['avg_volume'] or 0)
            })
        
        return heatmap_data
    
    @staticmethod
    def get_trading_volume_sparklines(days: int = 30) -> Dict[str, List[float]]:
        """Generate sparkline data for trading volumes"""
        
        end_time = timezone.now()
        start_time = end_time - timedelta(days=days)
        
        # Get daily volume data
        daily_volumes = SalesAggregate.objects.filter(
            date__gte=start_time.date(),
            date__lte=end_time.date()
        ).values('date').annotate(
            total_volume=Sum('total_volume')
        ).order_by('date')
        
        sparkline_data = {
            'dates': [item['date'].strftime('%Y-%m-%d') for item in daily_volumes],
            'volumes': [float(item['total_volume']) for item in daily_volumes]
        }
        
        return sparkline_data
import pandas as pd
import numpy as np
from scipy import stats
from scipy.stats import percentileofscore
from django.db import transaction
from django.utils import timezone
from django.core.cache import cache
from django.db.models import Count, Avg, StdDev, Q
import logging
import time
from typing import Dict, List, Tuple, Optional, Any
import json

from ..models_dir.rarity_analysis import (
    NFTTrait, 
    NFTRarityScore, 
    CollectionRarityMetrics, 
    RarityAnalysisJob
)
from marketplace.models import Collection, NFT

logger = logging.getLogger(__name__)


class RarityAnalysisService:
    """Service for calculating and managing NFT rarity scores"""
    
    CACHE_TIMEOUT = 3600  # 1 hour
    BATCH_SIZE = 100
    
    def __init__(self):
        self.cache_prefix = "rarity_analysis"
    
    def get_cached_rarity_score(self, nft_id: int) -> Optional[Dict]:
        """Get cached rarity score for an NFT"""
        cache_key = f"{self.cache_prefix}:nft_score:{nft_id}"
        return cache.get(cache_key)
    
    def set_cached_rarity_score(self, nft_id: int, score_data: Dict):
        """Cache rarity score for an NFT"""
        cache_key = f"{self.cache_prefix}:nft_score:{nft_id}"
        cache.set(cache_key, score_data, self.CACHE_TIMEOUT)
    
    def get_cached_collection_metrics(self, collection_id: int) -> Optional[Dict]:
        """Get cached collection rarity metrics"""
        cache_key = f"{self.cache_prefix}:collection_metrics:{collection_id}"
        return cache.get(cache_key)
    
    def set_cached_collection_metrics(self, collection_id: int, metrics_data: Dict):
        """Cache collection rarity metrics"""
        cache_key = f"{self.cache_prefix}:collection_metrics:{collection_id}"
        cache.set(cache_key, metrics_data, self.CACHE_TIMEOUT)
    
    def extract_traits_from_metadata(self, metadata: Dict) -> List[Dict]:
        """Extract traits from NFT metadata"""
        traits = []
        
        # Handle different metadata formats
        if 'attributes' in metadata:
            # OpenSea style
            for attr in metadata['attributes']:
                if isinstance(attr, dict) and 'trait_type' in attr and 'value' in attr:
                    traits.append({
                        'trait_type': str(attr['trait_type']),
                        'trait_value': str(attr['value'])
                    })
        
        elif 'properties' in metadata and 'attributes' in metadata['properties']:
            # Some other formats
            for attr in metadata['properties']['attributes']:
                if isinstance(attr, dict) and 'trait_type' in attr and 'value' in attr:
                    traits.append({
                        'trait_type': str(attr['trait_type']),
                        'trait_value': str(attr['value'])
                    })
        
        return traits
    
    def calculate_trait_frequencies(self, collection_id: int) -> Dict:
        """Calculate trait frequencies for a collection"""
        # Get all traits for the collection
        traits = NFTTrait.objects.filter(
            nft__collection_id=collection_id
        ).values('trait_type', 'trait_value').annotate(
            frequency=Count('id')
        )
        
        total_nfts = NFT.objects.filter(collection_id=collection_id).count()
        
        trait_frequencies = {}
        for trait in traits:
            trait_key = f"{trait['trait_type']}:{trait['trait_value']}"
            frequency = trait['frequency']
            percentage = (frequency / total_nfts) * 100 if total_nfts > 0 else 0
            
            trait_frequencies[trait_key] = {
                'frequency': frequency,
                'percentage': percentage,
                'rarity_score': max(0, 100 - percentage)  # Inverse of frequency
            }
        
        return trait_frequencies
    
    def calculate_nft_rarity_score(self, nft: NFT, trait_frequencies: Dict) -> Dict:
        """Calculate rarity score for a single NFT"""
        start_time = time.time()
        
        # Get NFT traits
        nft_traits = NFTTrait.objects.filter(nft=nft)
        
        if not nft_traits.exists():
            return {
                'total_rarity_score': 0.0,
                'trait_count': 0,
                'unique_trait_count': 0,
                'average_trait_rarity': 0.0,
                'calculation_duration': time.time() - start_time
            }
        
        trait_scores = []
        trait_data = []
        
        for trait in nft_traits:
            trait_key = f"{trait.trait_type}:{trait.trait_value}"
            
            if trait_key in trait_frequencies:
                rarity_score = trait_frequencies[trait_key]['rarity_score']
                frequency = trait_frequencies[trait_key]['frequency']
                percentage = trait_frequencies[trait_key]['percentage']
            else:
                # If trait not found in frequencies, assume it's rare
                rarity_score = 95.0
                frequency = 1
                percentage = 0.1
            
            trait_scores.append(rarity_score)
            trait_data.append({
                'trait_type': trait.trait_type,
                'trait_value': trait.trait_value,
                'rarity_score': rarity_score,
                'frequency': frequency,
                'percentage': percentage
            })
        
        # Calculate overall rarity score
        if trait_scores:
            total_rarity_score = np.mean(trait_scores)
            average_trait_rarity = np.mean(trait_scores)
            unique_trait_count = len(set([t['trait_value'] for t in trait_data]))
        else:
            total_rarity_score = 0.0
            average_trait_rarity = 0.0
            unique_trait_count = 0
        
        calculation_duration = time.time() - start_time
        
        return {
            'total_rarity_score': total_rarity_score,
            'trait_count': len(trait_scores),
            'unique_trait_count': unique_trait_count,
            'average_trait_rarity': average_trait_rarity,
            'trait_data': trait_data,
            'calculation_duration': calculation_duration
        }
    
    def calculate_collection_rarity_distribution(self, collection_id: int) -> Dict:
        """Calculate rarity distribution for a collection"""
        rarity_scores = NFTRarityScore.objects.filter(
            nft__collection_id=collection_id
        ).values_list('total_rarity_score', flat=True)
        
        if not rarity_scores:
            return {
                'average_rarity_score': 0.0,
                'median_rarity_score': 0.0,
                'rarity_std_deviation': 0.0,
                'percentiles': {}
            }
        
        scores = list(rarity_scores)
        
        return {
            'average_rarity_score': np.mean(scores),
            'median_rarity_score': np.median(scores),
            'rarity_std_deviation': np.std(scores),
            'percentiles': {
                '25': np.percentile(scores, 25),
                '50': np.percentile(scores, 50),
                '75': np.percentile(scores, 75),
                '90': np.percentile(scores, 90),
                '95': np.percentile(scores, 95),
                '99': np.percentile(scores, 99)
            }
        }
    
    def detect_diamond_hands(self, collection_id: int, threshold: float = 90.0) -> List[Dict]:
        """Detect holders with rare NFTs (diamond hands)"""
        rare_nfts = NFTRarityScore.objects.filter(
            nft__collection_id=collection_id,
            total_rarity_score__gte=threshold
        ).select_related('nft')
        
        diamond_hands = {}
        
        for rarity_score in rare_nfts:
            owner = rarity_score.nft.owner
            if owner not in diamond_hands:
                diamond_hands[owner] = {
                    'owner': owner,
                    'rare_nfts': [],
                    'total_rare_nfts': 0,
                    'average_rarity': 0.0
                }
            
            diamond_hands[owner]['rare_nfts'].append({
                'token_id': rarity_score.nft.token_id,
                'rarity_score': rarity_score.total_rarity_score,
                'rank': rarity_score.rarity_rank
            })
            diamond_hands[owner]['total_rare_nfts'] += 1
        
        # Calculate average rarity for each holder
        for holder in diamond_hands.values():
            if holder['rare_nfts']:
                holder['average_rarity'] = np.mean([nft['rarity_score'] for nft in holder['rare_nfts']])
        
        # Sort by number of rare NFTs and average rarity
        sorted_holders = sorted(
            diamond_hands.values(),
            key=lambda x: (x['total_rare_nfts'], x['average_rarity']),
            reverse=True
        )
        
        return sorted_holders
    
    def calculate_rarity_price_correlation(self, collection_id: int) -> Dict:
        """Calculate correlation between rarity and price"""
        # Get NFTs with both rarity scores and sale prices
        nfts_with_data = NFTRarityScore.objects.filter(
            nft__collection_id=collection_id,
            nft__last_sale_price__isnull=False
        ).select_related('nft')
        
        if not nfts_with_data:
            return {
                'correlation': None,
                'regression_coefficients': {},
                'sample_size': 0
            }
        
        # Prepare data
        rarity_scores = []
        prices = []
        
        for rarity_score in nfts_with_data:
            rarity_scores.append(rarity_score.total_rarity_score)
            prices.append(float(rarity_score.nft.last_sale_price))
        
        if len(rarity_scores) < 2:
            return {
                'correlation': None,
                'regression_coefficients': {},
                'sample_size': len(rarity_scores)
            }
        
        # Calculate correlation
        correlation = np.corrcoef(rarity_scores, prices)[0, 1]
        
        # Calculate regression
        slope, intercept, r_value, p_value, std_err = stats.linregress(rarity_scores, prices)
        
        return {
            'correlation': correlation if not np.isnan(correlation) else None,
            'regression_coefficients': {
                'slope': slope,
                'intercept': intercept,
                'r_squared': r_value ** 2,
                'p_value': p_value,
                'std_err': std_err
            },
            'sample_size': len(rarity_scores)
        }
    
    @transaction.atomic
    def process_collection_rarity_analysis(self, collection_id: int, force_refresh: bool = False) -> Dict:
        """Process complete rarity analysis for a collection"""
        start_time = time.time()
        
        try:
            collection = Collection.objects.get(id=collection_id)
            
            # Create or get analysis job
            job = RarityAnalysisJob.objects.create(
                collection=collection,
                job_type='initial' if force_refresh else 'refresh',
                force_refresh=force_refresh
            )
            
            job.start_job()
            
            # Get all NFTs in collection
            nfts = NFT.objects.filter(collection=collection)
            total_nfts = nfts.count()
            
            if total_nfts == 0:
                job.fail_job("No NFTs found in collection")
                return {'error': 'No NFTs found in collection'}
            
            # Calculate trait frequencies
            trait_frequencies = self.calculate_trait_frequencies(collection_id)
            
            # Process NFTs in batches
            processed_count = 0
            scored_count = 0
            errors_count = 0
            
            for i in range(0, total_nfts, self.BATCH_SIZE):
                batch_nfts = nfts[i:i + self.BATCH_SIZE]
                
                for nft in batch_nfts:
                    try:
                        # Calculate rarity score
                        score_data = self.calculate_nft_rarity_score(nft, trait_frequencies)
                        
                        # Save or update rarity score
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
                        
                        # Cache the score
                        self.set_cached_rarity_score(nft.id, {
                            'score': score_data['total_rarity_score'],
                            'rank': rarity_score.rarity_rank,
                            'calculated_at': timezone.now().isoformat()
                        })
                        
                    except Exception as e:
                        logger.error(f"Error processing NFT {nft.id}: {str(e)}")
                        errors_count += 1
                    
                    processed_count += 1
                
                # Update job progress
                job.nfts_processed = processed_count
                job.nfts_with_scores = scored_count
                job.errors_count = errors_count
                job.save()
            
            # Calculate ranks and percentiles
            rarity_scores = NFTRarityScore.objects.filter(nft__collection=collection).order_by('-total_rarity_score')
            
            for rank, rarity_score in enumerate(rarity_scores, 1):
                percentile = (rank / rarity_scores.count()) * 100
                rarity_score.rarity_rank = rank
                rarity_score.percentile = percentile
                rarity_score.save()
            
            # Calculate collection metrics
            distribution = self.calculate_collection_rarity_distribution(collection_id)
            diamond_hands = self.detect_diamond_hands(collection_id)
            price_correlation = self.calculate_rarity_price_correlation(collection_id)
            
            # Save collection metrics
            collection_metrics, created = CollectionRarityMetrics.objects.update_or_create(
                collection=collection,
                defaults={
                    'total_nfts': total_nfts,
                    'nfts_with_traits': scored_count,
                    'total_traits': len(trait_frequencies),
                    'trait_categories': len(set([k.split(':')[0] for k in trait_frequencies.keys()])),
                    'average_rarity_score': distribution['average_rarity_score'],
                    'median_rarity_score': distribution['median_rarity_score'],
                    'rarity_std_deviation': distribution['rarity_std_deviation'],
                    'rare_holders_count': len(diamond_hands),
                    'rarity_price_correlation': price_correlation['correlation'],
                    'price_rarity_regression': price_correlation['regression_coefficients'],
                    'analysis_status': 'completed',
                    'analysis_duration': time.time() - start_time
                }
            )
            
            # Cache collection metrics
            self.set_cached_collection_metrics(collection_id, {
                'total_nfts': total_nfts,
                'nfts_with_scores': scored_count,
                'average_rarity_score': distribution['average_rarity_score'],
                'rare_holders_count': len(diamond_hands),
                'rarity_price_correlation': price_correlation['correlation'],
                'analyzed_at': timezone.now().isoformat()
            })
            
            # Complete job
            job.complete_job(time.time() - start_time)
            
            return {
                'success': True,
                'collection_id': collection_id,
                'total_nfts': total_nfts,
                'nfts_with_scores': scored_count,
                'errors_count': errors_count,
                'analysis_duration': time.time() - start_time,
                'job_id': str(job.id)
            }
            
        except Exception as e:
            logger.error(f"Error in collection rarity analysis: {str(e)}")
            if 'job' in locals():
                job.fail_job(str(e))
            return {'error': str(e)}
    
    def get_nft_rarity_score(self, nft_id: int) -> Optional[Dict]:
        """Get rarity score for a specific NFT"""
        # Try cache first
        cached_score = self.get_cached_rarity_score(nft_id)
        if cached_score:
            return cached_score
        
        # Get from database
        try:
            rarity_score = NFTRarityScore.objects.select_related('nft').get(nft_id=nft_id)
            
            result = {
                'nft_id': nft_id,
                'token_id': rarity_score.nft.token_id,
                'collection_id': rarity_score.nft.collection.id,
                'collection_name': rarity_score.nft.collection.name,
                'total_rarity_score': rarity_score.total_rarity_score,
                'rarity_rank': rarity_score.rarity_rank,
                'percentile': rarity_score.percentile,
                'trait_count': rarity_score.trait_count,
                'unique_trait_count': rarity_score.unique_trait_count,
                'average_trait_rarity': rarity_score.average_trait_rarity,
                'calculation_method': rarity_score.calculation_method,
                'last_calculated': rarity_score.last_calculated.isoformat()
            }
            
            # Cache the result
            self.set_cached_rarity_score(nft_id, result)
            
            return result
            
        except NFTRarityScore.DoesNotExist:
            return None
    
    def get_collection_rarity_analysis(self, collection_id: int) -> Optional[Dict]:
        """Get complete rarity analysis for a collection"""
        # Try cache first
        cached_metrics = self.get_cached_collection_metrics(collection_id)
        if cached_metrics:
            return cached_metrics
        
        # Get from database
        try:
            collection = Collection.objects.get(id=collection_id)
            metrics = CollectionRarityMetrics.objects.get(collection=collection)
            
            # Get top 10 rarest NFTs
            rarest_nfts = NFTRarityScore.objects.filter(
                nft__collection=collection
            ).select_related('nft').order_by('rarity_rank')[:10]
            
            # Get diamond hands
            diamond_hands = self.detect_diamond_hands(collection_id)
            
            result = {
                'collection_id': collection_id,
                'collection_name': collection.name,
                'total_nfts': metrics.total_nfts,
                'nfts_with_traits': metrics.nfts_with_traits,
                'total_traits': metrics.total_traits,
                'trait_categories': metrics.trait_categories,
                'average_rarity_score': metrics.average_rarity_score,
                'median_rarity_score': metrics.median_rarity_score,
                'rarity_std_deviation': metrics.rarity_std_deviation,
                'rare_holders_count': metrics.rare_holders_count,
                'rarity_price_correlation': metrics.rarity_price_correlation,
                'price_rarity_regression': metrics.price_rarity_regression,
                'rarest_nfts': [
                    {
                        'token_id': score.nft.token_id,
                        'rarity_score': score.total_rarity_score,
                        'rank': score.rarity_rank,
                        'percentile': score.percentile
                    }
                    for score in rarest_nfts
                ],
                'diamond_hands': diamond_hands[:10],  # Top 10 diamond hands
                'last_analyzed': metrics.last_analyzed.isoformat(),
                'analysis_status': metrics.analysis_status
            }
            
            # Cache the result
            self.set_cached_collection_metrics(collection_id, result)
            
            return result
            
        except (Collection.DoesNotExist, CollectionRarityMetrics.DoesNotExist):
            return None 
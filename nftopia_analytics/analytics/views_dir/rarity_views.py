from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.utils import timezone
from django.db import models
import logging

from ..services.rarity_service import RarityAnalysisService
from ..models_dir.rarity_analysis import RarityAnalysisJob
from marketplace.models import Collection, NFT

logger = logging.getLogger(__name__)


class CollectionRarityAnalysisView(APIView):
    """API endpoint for collection rarity analysis"""
    
    def get(self, request, collection_address):
        """
        GET /api/rarity/{collection_address}
        
        Returns comprehensive rarity analysis for a collection
        """
        try:
            # Find collection by address or name
            collection = get_object_or_404(
                Collection, 
                name__icontains=collection_address
            )
            
            rarity_service = RarityAnalysisService()
            analysis = rarity_service.get_collection_rarity_analysis(collection.id)
            
            if not analysis:
                return Response({
                    'error': 'No rarity analysis found for this collection. Run analysis first.',
                    'collection_id': collection.id,
                    'collection_name': collection.name
                }, status=status.HTTP_404_NOT_FOUND)
            
            return Response({
                'success': True,
                'data': analysis
            })
            
        except Exception as e:
            logger.error(f"Error in collection rarity analysis: {str(e)}")
            return Response({
                'error': 'Failed to retrieve rarity analysis',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NFTRarityScoreView(APIView):
    """API endpoint for individual NFT rarity scores"""
    
    def get(self, request, nft_id):
        """
        GET /api/rarity/{nft_id}/score
        
        Returns rarity score for a specific NFT
        """
        try:
            rarity_service = RarityAnalysisService()
            score_data = rarity_service.get_nft_rarity_score(nft_id)
            
            if not score_data:
                return Response({
                    'error': 'No rarity score found for this NFT. Run analysis first.',
                    'nft_id': nft_id
                }, status=status.HTTP_404_NOT_FOUND)
            
            return Response({
                'success': True,
                'data': score_data
            })
            
        except Exception as e:
            logger.error(f"Error retrieving NFT rarity score: {str(e)}")
            return Response({
                'error': 'Failed to retrieve rarity score',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RarityRefreshView(APIView):
    """API endpoint for manual rarity analysis refresh"""
    
    permission_classes = [IsAuthenticated]
    
    def post(self, request, collection_address):
        """
        POST /api/rarity/refresh
        
        Triggers manual recalculation of rarity analysis for a collection
        """
        try:
            # Find collection by address or name
            collection = get_object_or_404(
                Collection, 
                name__icontains=collection_address
            )
            
            # Check if there's already a running job
            running_job = RarityAnalysisJob.objects.filter(
                collection=collection,
                status='running'
            ).first()
            
            if running_job:
                return Response({
                    'error': 'Rarity analysis is already running for this collection',
                    'job_id': str(running_job.id),
                    'started_at': running_job.started_at.isoformat() if running_job.started_at else None
                }, status=status.HTTP_409_CONFLICT)
            
            # Start new analysis
            rarity_service = RarityAnalysisService()
            force_refresh = request.data.get('force_refresh', False)
            
            # Run analysis asynchronously (in production, this would be a Celery task)
            result = rarity_service.process_collection_rarity_analysis(
                collection.id, 
                force_refresh=force_refresh
            )
            
            if 'error' in result:
                return Response({
                    'error': result['error']
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'success': True,
                'message': 'Rarity analysis started successfully',
                'data': result
            })
            
        except Exception as e:
            logger.error(f"Error starting rarity analysis: {str(e)}")
            return Response({
                'error': 'Failed to start rarity analysis',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RarityJobStatusView(APIView):
    """API endpoint for checking rarity analysis job status"""
    
    def get(self, request, job_id):
        """
        GET /api/rarity/job/{job_id}/status
        
        Returns status of a rarity analysis job
        """
        try:
            job = get_object_or_404(RarityAnalysisJob, id=job_id)
            
            return Response({
                'success': True,
                'data': {
                    'job_id': str(job.id),
                    'collection_id': job.collection.id,
                    'collection_name': job.collection.name,
                    'job_type': job.job_type,
                    'status': job.status,
                    'created_at': job.created_at.isoformat(),
                    'started_at': job.started_at.isoformat() if job.started_at else None,
                    'completed_at': job.completed_at.isoformat() if job.completed_at else None,
                    'duration': job.duration,
                    'nfts_processed': job.nfts_processed,
                    'nfts_with_scores': job.nfts_with_scores,
                    'errors_count': job.errors_count,
                    'error_details': job.error_details
                }
            })
            
        except Exception as e:
            logger.error(f"Error retrieving job status: {str(e)}")
            return Response({
                'error': 'Failed to retrieve job status',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RarityDashboardView(APIView):
    """API endpoint for rarity dashboard data"""
    
    def get(self, request):
        """
        GET /api/rarity/dashboard
        
        Returns dashboard data for rarity analysis
        """
        try:
            from ..models_dir.rarity_analysis import CollectionRarityMetrics, NFTRarityScore
            
            # Get overall statistics
            total_collections = Collection.objects.count()
            collections_with_analysis = CollectionRarityMetrics.objects.filter(
                analysis_status='completed'
            ).count()
            
            # Get recent analysis jobs
            recent_jobs = RarityAnalysisJob.objects.filter(
                status__in=['completed', 'failed']
            ).order_by('-created_at')[:10]
            
            # Get top collections by average rarity
            top_collections = CollectionRarityMetrics.objects.filter(
                analysis_status='completed'
            ).order_by('-average_rarity_score')[:5]
            
            # Get recent rare NFTs
            recent_rare_nfts = NFTRarityScore.objects.filter(
                rarity_rank__lte=10
            ).select_related('nft', 'nft__collection').order_by('-last_calculated')[:10]
            
            return Response({
                'success': True,
                'data': {
                    'overview': {
                        'total_collections': total_collections,
                        'collections_with_analysis': collections_with_analysis,
                        'analysis_coverage': (collections_with_analysis / total_collections * 100) if total_collections > 0 else 0
                    },
                    'recent_jobs': [
                        {
                            'job_id': str(job.id),
                            'collection_name': job.collection.name,
                            'status': job.status,
                            'created_at': job.created_at.isoformat(),
                            'duration': job.duration,
                            'nfts_processed': job.nfts_processed
                        }
                        for job in recent_jobs
                    ],
                    'top_collections': [
                        {
                            'collection_id': metrics.collection.id,
                            'collection_name': metrics.collection.name,
                            'average_rarity_score': metrics.average_rarity_score,
                            'total_nfts': metrics.total_nfts,
                            'rare_holders_count': metrics.rare_holders_count
                        }
                        for metrics in top_collections
                    ],
                    'recent_rare_nfts': [
                        {
                            'nft_id': score.nft.id,
                            'token_id': score.nft.token_id,
                            'collection_name': score.nft.collection.name,
                            'rarity_score': score.total_rarity_score,
                            'rank': score.rarity_rank,
                            'last_calculated': score.last_calculated.isoformat()
                        }
                        for score in recent_rare_nfts
                    ]
                }
            })
            
        except Exception as e:
            logger.error(f"Error retrieving dashboard data: {str(e)}")
            return Response({
                'error': 'Failed to retrieve dashboard data',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RarityMetricsView(APIView):
    """API endpoint for rarity analysis metrics and monitoring"""
    
    def get(self, request):
        """
        GET /api/rarity/metrics
        
        Returns metrics for monitoring rarity analysis performance
        """
        try:
            from ..models_dir.rarity_analysis import RarityAnalysisJob, NFTRarityScore
            
            # Calculate metrics
            total_jobs = RarityAnalysisJob.objects.count()
            completed_jobs = RarityAnalysisJob.objects.filter(status='completed').count()
            failed_jobs = RarityAnalysisJob.objects.filter(status='failed').count()
            running_jobs = RarityAnalysisJob.objects.filter(status='running').count()
            
            # Calculate average processing time
            completed_jobs_with_duration = RarityAnalysisJob.objects.filter(
                status='completed',
                duration__isnull=False
            )
            avg_duration = completed_jobs_with_duration.aggregate(
                avg_duration=models.Avg('duration')
            )['avg_duration'] or 0
            
            # Calculate cache hit ratio (simplified)
            cache_hits = cache.get('rarity_analysis:cache_hits', 0)
            cache_misses = cache.get('rarity_analysis:cache_misses', 0)
            total_requests = cache_hits + cache_misses
            cache_hit_ratio = (cache_hits / total_requests * 100) if total_requests > 0 else 0
            
            # API usage frequency (simplified - in production, use proper analytics)
            api_requests_today = cache.get('rarity_analysis:api_requests_today', 0)
            
            return Response({
                'success': True,
                'data': {
                    'job_metrics': {
                        'total_jobs': total_jobs,
                        'completed_jobs': completed_jobs,
                        'failed_jobs': failed_jobs,
                        'running_jobs': running_jobs,
                        'success_rate': (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0,
                        'avg_duration_seconds': avg_duration
                    },
                    'performance_metrics': {
                        'cache_hit_ratio': cache_hit_ratio,
                        'api_requests_today': api_requests_today,
                        'total_nfts_with_scores': NFTRarityScore.objects.count()
                    },
                    'last_updated': timezone.now().isoformat()
                }
            })
            
        except Exception as e:
            logger.error(f"Error retrieving metrics: {str(e)}")
            return Response({
                'error': 'Failed to retrieve metrics',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR) 
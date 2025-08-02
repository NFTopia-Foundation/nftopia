# NFT Rarity Analysis Implementation

## Overview

This document describes the implementation of NFT Rarity Analysis in the nftopia_analytics project. The system provides comprehensive rarity scoring and analysis capabilities for NFT collections, enabling collection owners and traders to understand the rarity distribution and value of individual NFTs.

## Features Implemented

### Core Features

1. **Rarity Algorithm Implementation**

    - Trait frequency analysis
    - Statistical rarity scoring
    - Rank normalization (0-100 scale)
    - Support for ERC721/1155 contracts

2. **Collection Analysis**

    - Rarity distribution charts
    - "Diamond hands" detection (rare holders)
    - Rarity-price correlation metrics
    - Collection-level statistics

3. **API Endpoints**

    - `GET /api/rarity/{collection_address}` - Collection analysis
    - `GET /api/rarity/{nft_id}/score` - Individual NFT score
    - `POST /api/rarity/refresh/{collection_address}` - Manual recalculation
    - `GET /api/rarity/job/{job_id}/status` - Job status
    - `GET /api/rarity/dashboard` - Dashboard data
    - `GET /api/rarity/metrics` - Performance metrics

4. **Dashboard Interface**
    - Real-time rarity analysis visualization
    - Interactive charts and heatmaps
    - Job monitoring and management
    - Performance metrics tracking

## Technical Architecture

### Models

#### NFTTrait

Stores individual NFT traits for rarity analysis:

-   `trait_type`: Trait category (e.g., Background, Eyes)
-   `trait_value`: Trait value (e.g., Blue, Laser Eyes)
-   `rarity_score`: Rarity score for this specific trait (0-100)
-   `frequency`: Number of NFTs with this trait
-   `frequency_percentage`: Percentage of collection with this trait

#### NFTRarityScore

Stores calculated rarity scores for individual NFTs:

-   `total_rarity_score`: Overall rarity score (0-100)
-   `rarity_rank`: Rank within collection (1 = rarest)
-   `percentile`: Percentile rank (0-100)
-   `trait_count`: Number of traits
-   `unique_trait_count`: Number of unique traits
-   `average_trait_rarity`: Average rarity of all traits

#### CollectionRarityMetrics

Stores collection-level rarity analysis metrics:

-   `total_nfts`: Total NFTs in collection
-   `nfts_with_traits`: NFTs with trait data
-   `average_rarity_score`: Average rarity score
-   `rare_holders_count`: Number of holders with rare NFTs
-   `rarity_price_correlation`: Correlation between rarity and price
-   `analysis_status`: Current analysis status

#### RarityAnalysisJob

Tracks rarity analysis jobs for monitoring and debugging:

-   `job_type`: Type of analysis (initial/refresh/incremental)
-   `status`: Job status (pending/running/completed/failed)
-   `duration`: Processing time
-   `nfts_processed`: Number of NFTs processed
-   `errors_count`: Number of errors encountered

### Services

#### RarityAnalysisService

Core service for calculating and managing NFT rarity scores:

**Key Methods:**

-   `calculate_trait_frequencies()`: Calculate trait frequencies for a collection
-   `calculate_nft_rarity_score()`: Calculate rarity score for a single NFT
-   `detect_diamond_hands()`: Detect holders with rare NFTs
-   `calculate_rarity_price_correlation()`: Calculate correlation between rarity and price
-   `process_collection_rarity_analysis()`: Process complete rarity analysis for a collection

**Algorithm:**

1. Extract traits from NFT metadata
2. Calculate trait frequencies across the collection
3. Assign rarity scores based on inverse frequency
4. Calculate overall rarity score as average of trait scores
5. Rank NFTs by rarity score
6. Calculate percentiles and distribution statistics

### API Views

#### CollectionRarityAnalysisView

-   Returns comprehensive rarity analysis for a collection
-   Includes rarity distribution, diamond hands, and price correlation

#### NFTRarityScoreView

-   Returns rarity score for a specific NFT
-   Includes rank, percentile, and trait breakdown

#### RarityRefreshView

-   Triggers manual recalculation of rarity analysis
-   Supports force refresh option

#### RarityDashboardView

-   Returns dashboard data for rarity analysis
-   Includes overview statistics and recent activity

#### RarityMetricsView

-   Returns performance metrics for monitoring
-   Includes job success rates and cache hit ratios

### Celery Tasks

#### process_collection_rarity_analysis

-   Processes complete rarity analysis for a collection
-   Handles large collections asynchronously
-   Updates job status and progress

#### extract_nft_traits_from_metadata

-   Extracts NFT traits from metadata
-   Supports multiple metadata formats
-   Creates trait records for analysis

#### update_rarity_scores_batch

-   Updates rarity scores in batches
-   Optimized for large collections
-   Handles errors gracefully

#### cleanup_old_rarity_jobs

-   Cleans up old analysis jobs
-   Maintains database performance

## Installation and Setup

### Dependencies

Add to `requirements.txt`:

```
scipy==1.11.4
```

### Database Migration

Run the migration to create the rarity analysis tables:

```bash
python manage.py migrate analytics 0002_rarity_analysis
```

### Management Commands

Use the setup command to initialize rarity analysis:

```bash
# Analyze all collections
python manage.py setup_rarity_analysis --all-collections

# Analyze specific collection
python manage.py setup_rarity_analysis --collection-id 1

# Force refresh existing analysis
python manage.py setup_rarity_analysis --collection-id 1 --force-refresh

# Dry run to see what would be done
python manage.py setup_rarity_analysis --collection-id 1 --dry-run
```

## Usage Examples

### API Usage

#### Get Collection Analysis

```bash
curl -X GET "http://localhost:8000/analytics/api/rarity/my-collection/"
```

Response:

```json
{
  "success": true,
  "data": {
    "collection_id": 1,
    "collection_name": "My Collection",
    "total_nfts": 10000,
    "nfts_with_traits": 9500,
    "average_rarity_score": 50.5,
    "rare_holders_count": 150,
    "rarest_nfts": [...],
    "diamond_hands": [...],
    "last_analyzed": "2024-01-01T12:00:00Z"
  }
}
```

#### Get NFT Rarity Score

```bash
curl -X GET "http://localhost:8000/analytics/api/rarity/123/score/"
```

Response:

```json
{
    "success": true,
    "data": {
        "nft_id": 123,
        "token_id": "123",
        "total_rarity_score": 85.5,
        "rarity_rank": 5,
        "percentile": 95.0,
        "trait_count": 7,
        "unique_trait_count": 6,
        "average_trait_rarity": 85.5
    }
}
```

#### Refresh Analysis

```bash
curl -X POST "http://localhost:8000/analytics/api/rarity/refresh/my-collection/" \
  -H "Content-Type: application/json" \
  -d '{"force_refresh": true}'
```

### Dashboard Access

Access the rarity analysis dashboard at:

```
http://localhost:8000/analytics/rarity-dashboard/
```

## Performance Considerations

### Caching

-   Rarity scores are cached for 1 hour
-   Collection metrics are cached for 1 hour
-   Cache hit ratio is tracked for monitoring

### Batch Processing

-   Large collections are processed in batches of 100 NFTs
-   Progress is tracked and reported
-   Errors are handled gracefully

### Database Optimization

-   Indexes on frequently queried fields
-   Efficient queries using select_related
-   Pagination for large result sets

## Error Handling

### Common Error Cases

1. **Incomplete Trait Data**

    - NFTs without traits are assigned a default score of 0
    - Missing traits are logged for analysis

2. **Contract ABI Mismatches**

    - Graceful fallback to basic trait extraction
    - Error logging for debugging

3. **Score Calculation Timeouts**
    - Jobs are marked as failed after timeout
    - Retry mechanism for failed jobs
    - Progress tracking to resume from last successful point

### Monitoring

The system tracks:

-   ✅ Rarity score calculation time
-   ✅ Cache hit ratio for scores
-   ✅ API endpoint usage frequency
-   ✅ Job success/failure rates
-   ✅ Processing errors and their types

## Integration Points

### Service Integration

-   **nft-service**: Add rarity score field to NFT model
-   **api-gateway**: Proxy new rarity endpoints
-   **frontend**: Display rarity badges and scores

### Metrics Integration

-   Prometheus metrics for monitoring
-   Grafana dashboards for visualization
-   Alerting for failed jobs and performance issues

## Future Enhancements

### Planned Features

1. **Advanced Rarity Algorithms**

    - Weighted trait scoring
    - Machine learning-based rarity prediction
    - Dynamic rarity thresholds

2. **Enhanced Analytics**

    - Rarity trend analysis over time
    - Cross-collection rarity comparison
    - Predictive rarity modeling

3. **Performance Improvements**
    - Parallel processing for large collections
    - Real-time rarity updates
    - Advanced caching strategies

### API Extensions

1. **Bulk Operations**

    - Batch rarity score retrieval
    - Multi-collection analysis
    - Bulk export functionality

2. **Advanced Filtering**
    - Filter by rarity range
    - Filter by trait combinations
    - Filter by holder characteristics

## Troubleshooting

### Common Issues

1. **Slow Analysis Performance**

    - Check batch size settings
    - Monitor database performance
    - Verify cache configuration

2. **Missing Trait Data**

    - Verify metadata format
    - Check trait extraction logic
    - Review error logs

3. **Job Failures**
    - Check Celery worker status
    - Review job error details
    - Verify collection data integrity

### Debug Commands

```bash
# Check job status
python manage.py shell
>>> from analytics.models_dir.rarity_analysis import RarityAnalysisJob
>>> job = RarityAnalysisJob.objects.get(id='job-id')
>>> print(job.error_details)

# Test rarity calculation
python manage.py shell
>>> from analytics.services.rarity_service import RarityAnalysisService
>>> service = RarityAnalysisService()
>>> result = service.get_collection_rarity_analysis(1)
>>> print(result)
```

## Contributing

When contributing to the rarity analysis system:

1. **Follow the existing code structure**
2. **Add comprehensive tests**
3. **Update documentation**
4. **Consider performance implications**
5. **Handle error cases gracefully**

## License

This implementation is part of the nftopia_analytics project and follows the same licensing terms.

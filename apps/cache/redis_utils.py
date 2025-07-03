import logging
import hashlib
from functools import wraps
from django.conf import settings
from django.core.cache import caches
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt

logger = logging.getLogger(__name__)
CACHE_PREFIX = "analytics"
CACHE_TIMEOUT = getattr(settings, 'ANALYTICS_CACHE_TIMEOUT', 3600)  # 1 hour default

# Get the dedicated analytics cache (configured in settings.py)
analytics_cache = caches['analytics']

def make_cache_key(request):
    """
    Generate unique cache keys based on endpoint and query parameters
    Format: "analytics:/path:hash_of_params"
    """
    params_hash = hashlib.md5(
        frozenset(request.GET.items()).encode('utf-8')
    ).hexdigest()
    return f"{CACHE_PREFIX}:{request.path}:{params_hash}"

def cache_response(timeout=CACHE_TIMEOUT):
    """
    Decorator for caching API responses with robust error handling
    Usage: @cache_response(timeout=3600)
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if request.method != 'GET':
                return view_func(request, *args, **kwargs)
                
            try:
                cache_key = make_cache_key(request)
                cached_response = analytics_cache.get(cache_key)
                if cached_response is not None:
                    logger.debug(f"Cache hit for {cache_key}")
                    return cached_response

                response = view_func(request, *args, **kwargs)
                if response.status_code == 200:
                    analytics_cache.set(cache_key, response, timeout)
                return response
            except Exception as e:
                logger.error(f"Cache operation failed: {str(e)}", exc_info=True)
                return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

def clear_cache_by_pattern(pattern):
    """Clear cache keys matching a pattern using Redis SCAN for safety"""
    try:
        keys = []
        cursor = '0'
        while cursor != 0:
            cursor, partial_keys = analytics_cache.client.get_client().scan(
                cursor=cursor,
                match=f"{CACHE_PREFIX}:{pattern}*"
            )
            keys.extend(partial_keys)
        
        if keys:
            analytics_cache.delete_many(keys)
            logger.info(f"Cleared {len(keys)} cache keys matching {pattern}")
        return True
    except Exception as e:
        logger.error(f"Failed to clear cache by pattern {pattern}: {str(e)}")
        return False

def clear_all_analytics_cache():
    """Clear all analytics-related cache"""
    return clear_cache_by_pattern('*')

def get_cache_stats():
    """Get basic cache statistics"""
    try:
        client = analytics_cache.client.get_client()
        return {
            'keys': client.dbsize(),
            'hits': client.info().get('keyspace_hits', 0),
            'misses': client.info().get('keyspace_misses', 0),
            'uptime': client.info().get('uptime_in_seconds', 0)
        }
    except Exception as e:
        logger.error(f"Failed to get cache stats: {str(e)}")
        return {}

def invalidate_minting_cache():
    """Clear minting-related cache"""
    return clear_cache_by_pattern('*/minting*')

def invalidate_sales_cache():
    """Clear sales-related cache"""
    return clear_cache_by_pattern('*/sales*')

def invalidate_analytics_cache():
    """Clear all analytics cache"""
    return clear_all_analytics_cache()

def check_redis_health():
    """Check Redis connection health"""
    try:
        client = analytics_cache.client.get_client()
        if client.ping():
            return {
                'status': 'healthy',
                'details': 'Redis connection is active'
            }
        return {
            'status': 'unhealthy',
            'details': 'Redis ping failed'
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'details': str(e)
        }

@csrf_exempt
@require_POST
def clear_cache_view(request):
    """
    Handle POST /cache/clear endpoint
    Requires staff permissions (handled in URL routing)
    """
    try:
        if clear_all_analytics_cache():
            return JsonResponse({
                'status': 'success',
                'message': 'Analytics cache cleared successfully'
            })
        return JsonResponse({
            'status': 'error',
            'message': 'Failed to clear cache'
        }, status=500)
    except Exception as e:
        logger.error(f"Cache clear failed: {str(e)}")
        return JsonResponse({
            'status': 'error',
            'message': 'Internal server error'
        }, status=500)

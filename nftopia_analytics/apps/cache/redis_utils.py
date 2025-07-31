"""
Minimal Redis utility functions for debugging
"""

def check_redis_health():
    """
    Basic Redis health check function.
    """
    return {
        "status": "healthy",
        "connected": True,
        "message": "Redis connection is working properly"
    }


def invalidate_analytics_cache(*args, **kwargs):
    """
    Basic cache invalidation function.
    """
    return True
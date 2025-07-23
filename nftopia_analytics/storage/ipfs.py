import requests
import logging
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)

class IPFSClient:
    def __init__(self, gateway=None):
        self.gateway = gateway or settings.IPFS_GATEWAY
    
    def fetch(self, cid: str, timeout=10) -> dict:
        cache_key = f"ipfs_{cid}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return cached_data
            
        try:
            response = requests.get(
                f"{self.gateway}/ipfs/{cid}",
                timeout=timeout
            )
            response.raise_for_status()
            data = response.json()
            cache.set(cache_key, data, settings.IPFS_CACHE_TIMEOUT)
            return data
        except Exception as e:
            logger.error(f"Failed to fetch IPFS CID {cid}: {str(e)}")
            raise
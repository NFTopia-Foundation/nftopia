from prometheus_client import Counter, Histogram
from django.conf import settings

REQUEST_COUNT = Counter(
    'django_http_requests_total',
    'Total HTTP Requests',
    ['method', 'path', 'status']
)

REQUEST_LATENCY = Histogram(
    'django_http_requests_latency_seconds',
    'HTTP Request Latency',
    ['method', 'path']
)

class MetricsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        method = request.method
        path = request.path
        
        with REQUEST_LATENCY.labels(method, path).time():
            response = self.get_response(request)
            REQUEST_COUNT.labels(method, path, response.status_code).inc()
            
        return response
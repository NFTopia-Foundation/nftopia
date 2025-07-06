from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_ratelimit.decorators import ratelimit
from .utils import verify_hmac
from .tasks import process_chain_event

@csrf_exempt
@api_view(['POST'])
@ratelimit(key='ip', rate='100/m', block=True)
def blockchain_webhook(request):
    signature = request.headers.get('X-Signature')
    if not verify_hmac(request.data, signature):
        return Response({'error': 'Invalid signature'}, status=403)
    
    try:
        process_chain_event.delay(request.data)
        return Response({'status': 'processing'}, status=202)
    except Exception as e:
        return Response({'error': str(e)}, status=400)
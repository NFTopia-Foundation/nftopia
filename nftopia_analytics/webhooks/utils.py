import hmac
import hashlib
from django.conf import settings

def verify_hmac(payload, signature):
    secret = settings.WEBHOOK_SECRET.encode()
    expected = hmac.new(secret, payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
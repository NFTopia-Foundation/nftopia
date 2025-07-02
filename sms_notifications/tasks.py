from celery import shared_task
from django.contrib.auth.models import User
from decimal import Decimal
import logging

from .services import NFTSMSNotifier

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def send_bid_alert_async(self, user_id, phone_number, nft_name, bid_amount, bidder, nft_id, auction_id):
    """Async task to send bid alert SMS"""
    try:
        user = User.objects.get(id=user_id)
        notifier = NFTSMSNotifier()
        
        success, error, notification = notifier.send_bid_alert(
            user=user,
            phone_number=phone_number,
            nft_name=nft_name,
            bid_amount=Decimal(str(bid_amount)),
            bidder=bidder,
            nft_id=nft_id,
            auction_id=auction_id
        )
        
        if not success:
            logger.error(f"Failed to send bid alert SMS: {error}")
            raise Exception(error)
            
        return f"Bid alert SMS sent successfully to {phone_number}"
        
    except Exception as exc:
        logger.error(f"Error in send_bid_alert_async: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

@shared_task(bind=True, max_retries=3)
def send_auction_ending_alert_async(self, user_id, phone_number, nft_name, time_remaining, current_bid, nft_id, auction_id):
    """Async task to send auction ending alert SMS"""
    try:
        user = User.objects.get(id=user_id)
        notifier = NFTSMSNotifier()
        
        success, error, notification = notifier.send_auction_ending_alert(
            user=user,
            phone_number=phone_number,
            nft_name=nft_name,
            time_remaining=time_remaining,
            current_bid=Decimal(str(current_bid)),
            nft_id=nft_id,
            auction_id=auction_id
        )
        
        if not success:
            logger.error(f"Failed to send auction ending alert SMS: {error}")
            raise Exception(error)
            
        return f"Auction ending alert SMS sent successfully to {phone_number}"
        
    except Exception as exc:
        logger.error(f"Error in send_auction_ending_alert_async: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

@shared_task(bind=True, max_retries=3)
def send_two_factor_auth_async(self, user_id, phone_number, code):
    """Async task to send 2FA SMS"""
    try:
        user = User.objects.get(id=user_id)
        notifier = NFTSMSNotifier()
        
        success, error, notification = notifier.send_two_factor_auth(
            user=user,
            phone_number=phone_number,
            code=code
        )
        
        if not success:
            logger.error(f"Failed to send 2FA SMS: {error}")
            raise Exception(error)
            
        return f"2FA SMS sent successfully to {phone_number}"
        
    except Exception as exc:
        logger.error(f"Error in send_two_factor_auth_async: {exc}")
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))

@shared_task(bind=True, max_retries=3)
def send_transaction_confirmation_async(self, user_id, phone_number, transaction_type, nft_name, amount, tx_hash, nft_id):
    """Async task to send transaction confirmation SMS"""
    try:
        user = User.objects.get(id=user_id)
        notifier = NFTSMSNotifier()
        
        success, error, notification = notifier.send_transaction_confirmation(
            user=user,
            phone_number=phone_number,
            transaction_type=transaction_type,
            nft_name=nft_name,
            amount=Decimal(str(amount)),
            tx_hash=tx_hash,
            nft_id=nft_id
        )
        
        if not success:
            logger.error(f"Failed to send transaction confirmation SMS: {error}")
            raise Exception(error)
            
        return f"Transaction confirmation SMS sent successfully to {phone_number}"
        
    except Exception as exc:
        logger.error(f"Error in send_transaction_confirmation_async: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

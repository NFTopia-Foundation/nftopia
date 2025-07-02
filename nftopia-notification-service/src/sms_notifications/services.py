import logging
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.cache import cache

from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
import phonenumbers
from phonenumbers import carrier, geocoder

from .models import SMSNotification, SMSRateLimit, CarrierCompliance

logger = logging.getLogger(__name__)

class TwilioSMSService:
    def __init__(self):
        self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        self.from_number = settings.TWILIO_PHONE_NUMBER

    def send_sms(self, to_number: str, message: str, notification_type: str, 
                 user: User, **kwargs) -> Tuple[bool, Optional[str], Optional[SMSNotification]]:
        """
        Send SMS with rate limiting and compliance checks
        """
        try:
            # Rate limiting check
            if not self._check_rate_limit(user):
                logger.warning(f"Rate limit exceeded for user {user.id}")
                return False, "Rate limit exceeded (10 SMS/hour)", None

            # Phone number validation and carrier compliance
            is_valid, compliance_message = self._validate_phone_and_compliance(to_number, message)
            if not is_valid:
                logger.warning(f"Compliance check failed: {compliance_message}")
                return False, compliance_message, None

            # Create SMS notification record
            sms_notification = SMSNotification.objects.create(
                user=user,
                phone_number=to_number,
                message=message,
                notification_type=notification_type,
                nft_id=kwargs.get('nft_id'),
                auction_id=kwargs.get('auction_id'),
                bid_amount=kwargs.get('bid_amount'),
                transaction_hash=kwargs.get('transaction_hash')
            )

            # Send SMS via Twilio
            twilio_message = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_number,
                status_callback=f"{settings.BASE_URL}/sms/webhook/status/"
            )

            # Update notification record
            sms_notification.twilio_sid = twilio_message.sid
            sms_notification.status = 'sent'
            sms_notification.sent_at = timezone.now()
            sms_notification.save()

            # Update rate limit counter
            self._increment_rate_limit(user)

            logger.info(f"SMS sent successfully to {to_number}, SID: {twilio_message.sid}")
            return True, None, sms_notification

        except TwilioRestException as e:
            logger.error(f"Twilio error: {e}")
            if 'sms_notification' in locals():
                sms_notification.status = 'failed'
                sms_notification.error_message = str(e)
                sms_notification.save()
            return False, str(e), sms_notification if 'sms_notification' in locals() else None

        except Exception as e:
            logger.error(f"Unexpected error sending SMS: {e}")
            if 'sms_notification' in locals():
                sms_notification.status = 'failed'
                sms_notification.error_message = str(e)
                sms_notification.save()
            return False, str(e), sms_notification if 'sms_notification' in locals() else None

    def _check_rate_limit(self, user: User) -> bool:
        """Check if user has exceeded SMS rate limit"""
        current_hour = timezone.now().replace(minute=0, second=0, microsecond=0)
        cache_key = f"sms_rate_limit_{user.id}_{current_hour.isoformat()}"
        
        current_count = cache.get(cache_key, 0)
        return current_count < 10

    def _increment_rate_limit(self, user: User):
        """Increment SMS rate limit counter"""
        current_hour = timezone.now().replace(minute=0, second=0, microsecond=0)
        cache_key = f"sms_rate_limit_{user.id}_{current_hour.isoformat()}"
        
        current_count = cache.get(cache_key, 0)
        cache.set(cache_key, current_count + 1, timeout=3600)  # 1 hour timeout

    def _validate_phone_and_compliance(self, phone_number: str, message: str) -> Tuple[bool, Optional[str]]:
        """Validate phone number and check carrier compliance"""
        try:
            # Parse and validate phone number
            parsed_number = phonenumbers.parse(phone_number, None)
            if not phonenumbers.is_valid_number(parsed_number):
                return False, "Invalid phone number format"

            # Get carrier information
            carrier_name = carrier.name_for_number(parsed_number, "en")
            country_code = phonenumbers.region_code_for_number(parsed_number)

            # Check carrier compliance rules
            try:
                compliance = CarrierCompliance.objects.get(
                    carrier_name=carrier_name,
                    country_code=country_code
                )
                
                # Check message length
                if len(message) > compliance.max_message_length:
                    return False, f"Message too long for carrier (max {compliance.max_message_length} chars)"

                # Check for restricted keywords
                message_lower = message.lower()
                for keyword in compliance.restricted_keywords:
                    if keyword.lower() in message_lower:
                        return False, f"Message contains restricted keyword: {keyword}"

            except CarrierCompliance.DoesNotExist:
                # Use default compliance rules if carrier not found
                if len(message) > 160:
                    return False, "Message too long (max 160 chars for unknown carrier)"

            return True, None

        except phonenumbers.NumberParseException:
            return False, "Unable to parse phone number"

    def handle_delivery_receipt(self, message_sid: str, status: str):
        """Handle Twilio delivery receipt webhook"""
        try:
            sms_notification = SMSNotification.objects.get(twilio_sid=message_sid)
            sms_notification.status = status.lower()
            
            if status.lower() == 'delivered':
                sms_notification.delivered_at = timezone.now()
            elif status.lower() in ['failed', 'undelivered']:
                logger.warning(f"SMS delivery failed for SID {message_sid}")
            
            sms_notification.save()
            logger.info(f"Updated SMS status for SID {message_sid}: {status}")
            
        except SMSNotification.DoesNotExist:
            logger.error(f"SMS notification not found for SID {message_sid}")

class NFTSMSTemplates:
    """NFT-specific SMS message templates"""
    
    @staticmethod
    def bid_alert(nft_name: str, bid_amount: Decimal, bidder: str) -> str:
        return f"🎨 New bid on {nft_name}! {bidder} bid {bid_amount} ETH. Check your NFTopia dashboard to respond."

    @staticmethod
    def auction_ending_alert(nft_name: str, time_remaining: str, current_bid: Decimal) -> str:
        return f"⏰ Auction ending soon! {nft_name} - Current bid: {current_bid} ETH. Time left: {time_remaining}. Act now!"

    @staticmethod
    def auction_won_alert(nft_name: str, winning_bid: Decimal) -> str:
        return f"🎉 Congratulations! You won {nft_name} for {winning_bid} ETH. Complete your purchase in NFTopia."

    @staticmethod
    def two_factor_auth(code: str) -> str:
        return f"Your NFTopia verification code is: {code}. This code expires in 10 minutes. Do not share this code."

    @staticmethod
    def transaction_confirmation(transaction_type: str, nft_name: str, amount: Decimal, tx_hash: str) -> str:
        short_hash = f"{tx_hash[:6]}...{tx_hash[-4:]}"
        return f"✅ {transaction_type} confirmed! {nft_name} - {amount} ETH. TX: {short_hash}. View on NFTopia."

    @staticmethod
    def high_value_transaction_alert(nft_name: str, amount: Decimal) -> str:
        return f"🔒 High-value transaction detected: {nft_name} - {amount} ETH. If this wasn't you, secure your account immediately."

# Convenience functions for different notification types
class NFTSMSNotifier:
    def __init__(self):
        self.sms_service = TwilioSMSService()
        self.templates = NFTSMSTemplates()

    def send_bid_alert(self, user: User, phone_number: str, nft_name: str, 
                      bid_amount: Decimal, bidder: str, nft_id: str, auction_id: str):
        message = self.templates.bid_alert(nft_name, bid_amount, bidder)
        return self.sms_service.send_sms(
            phone_number, message, 'bid_alert', user,
            nft_id=nft_id, auction_id=auction_id, bid_amount=bid_amount
        )

    def send_auction_ending_alert(self, user: User, phone_number: str, nft_name: str,
                                time_remaining: str, current_bid: Decimal, nft_id: str, auction_id: str):
        message = self.templates.auction_ending_alert(nft_name, time_remaining, current_bid)
        return self.sms_service.send_sms(
            phone_number, message, 'auction_alert', user,
            nft_id=nft_id, auction_id=auction_id, bid_amount=current_bid
        )

    def send_two_factor_auth(self, user: User, phone_number: str, code: str):
        message = self.templates.two_factor_auth(code)
        return self.sms_service.send_sms(phone_number, message, 'two_factor_auth', user)

    def send_transaction_confirmation(self, user: User, phone_number: str, transaction_type: str,
                                    nft_name: str, amount: Decimal, tx_hash: str, nft_id: str):
        message = self.templates.transaction_confirmation(transaction_type, nft_name, amount, tx_hash)
        return self.sms_service.send_sms(
            phone_number, message, 'transaction_confirmation', user,
            nft_id=nft_id, transaction_hash=tx_hash, bid_amount=amount
        )

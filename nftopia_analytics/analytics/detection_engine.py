import numpy as np
import pandas as pd
from django.db.models import Avg, Count, Sum, Q
from django.utils import timezone
from datetime import timedelta
from typing import List, Dict, Any
from .models import NFTTransaction, AnomalyDetection, AnomalyModel, UserBehaviorProfile
import logging

logger = logging.getLogger(__name__)

class BaseDetector:
    def __init__(self, anomaly_model: AnomalyModel):
        self.model = anomaly_model
        self.threshold = anomaly_model.threshold
        self.lookback_window = anomaly_model.lookback_window
    
    def detect(self, data: Any) -> List[Dict]:
        raise NotImplementedError("Subclasses must implement detect method")
    
    def calculate_confidence(self, value: float, baseline: float, std: float) -> float:
        """Calculate confidence score based on standard deviations from baseline"""
        if std == 0:
            return 1.0 if value != baseline else 0.0
        z_score = abs(value - baseline) / std
        return min(z_score / 3.0, 1.0)  # Normalize to 0-1 scale

class VolumeSpikeDetector(BaseDetector):
    def detect(self, collection_address: str = None) -> List[Dict]:
        anomalies = []
        end_time = timezone.now()
        start_time = end_time - self.lookback_window
        
        # Get recent transactions
        query = NFTTransaction.objects.filter(
            timestamp__gte=start_time,
            timestamp__lte=end_time,
            transaction_type='sale'
        )
        
        if collection_address:
            query = query.filter(nft_contract=collection_address)
        
        # Group by hour and calculate volume
        hourly_volumes = {}
        for transaction in query:
            hour_key = transaction.timestamp.replace(minute=0, second=0, microsecond=0)
            if hour_key not in hourly_volumes:
                hourly_volumes[hour_key] = 0
            hourly_volumes[hour_key] += float(transaction.price or 0)
        
        if len(hourly_volumes) < 2:
            return anomalies
        
        volumes = list(hourly_volumes.values())
        baseline = np.mean(volumes)
        std_dev = np.std(volumes)
        
        for hour, volume in hourly_volumes.items():
            if volume > baseline + (self.threshold * std_dev):
                confidence = self.calculate_confidence(volume, baseline, std_dev)
                severity = self._determine_severity(confidence)
                
                anomalies.append({
                    'type': 'volume_spike',
                    'timestamp': hour,
                    'value': volume,
                    'baseline': baseline,
                    'confidence': confidence,
                    'severity': severity,
                    'data': {
                        'collection': collection_address,
                        'spike_ratio': volume / baseline if baseline > 0 else float('inf'),
                        'std_deviations': (volume - baseline) / std_dev if std_dev > 0 else 0
                    }
                })
        
        return anomalies
    
    def _determine_severity(self, confidence: float) -> str:
        if confidence >= 0.9:
            return 'critical'
        elif confidence >= 0.7:
            return 'high'
        elif confidence >= 0.5:
            return 'medium'
        else:
            return 'low'

class WashTradingDetector(BaseDetector):
    def detect(self, wallet_address: str = None) -> List[Dict]:
        anomalies = []
        end_time = timezone.now()
        start_time = end_time - self.lookback_window
        
        # Look for circular trading patterns
        transactions = NFTTransaction.objects.filter(
            timestamp__gte=start_time,
            timestamp__lte=end_time,
            transaction_type='sale'
        )
        
        if wallet_address:
            transactions = transactions.filter(
                Q(buyer_address=wallet_address) | Q(seller_address=wallet_address)
            )
        
        # Group by NFT and analyze trading patterns
        nft_trades = {}
        for tx in transactions:
            nft_key = f"{tx.nft_contract}:{tx.token_id}"
            if nft_key not in nft_trades:
                nft_trades[nft_key] = []
            nft_trades[nft_key].append(tx)
        
        for nft_key, trades in nft_trades.items():
            if len(trades) < 3:  # Need at least 3 trades to detect wash trading
                continue
            
            # Sort by timestamp
            trades.sort(key=lambda x: x.timestamp)
            
            # Check for circular patterns
            addresses = set()
            for trade in trades:
                addresses.add(trade.buyer_address)
                addresses.add(trade.seller_address)
            
            # Calculate wash trading indicators
            unique_addresses = len(addresses)
            trade_count = len(trades)
            
            # Suspicious if few unique addresses but many trades
            if unique_addresses <= trade_count * 0.3:  # Less than 30% unique addresses
                confidence = 1 - (unique_addresses / trade_count)
                severity = self._determine_severity(confidence)
                
                anomalies.append({
                    'type': 'wash_trade',
                    'nft': nft_key,
                    'confidence': confidence,
                    'severity': severity,
                    'data': {
                        'trade_count': trade_count,
                        'unique_addresses': unique_addresses,
                        'address_ratio': unique_addresses / trade_count,
                        'trades': [
                            {
                                'hash': trade.transaction_hash,
                                'buyer': trade.buyer_address,
                                'seller': trade.seller_address,
                                'price': float(trade.price or 0),
                                'timestamp': trade.timestamp.isoformat()
                            } for trade in trades
                        ]
                    }
                })
        
        return anomalies
    
    def _determine_severity(self, confidence: float) -> str:
        if confidence >= 0.8:
            return 'critical'
        elif confidence >= 0.6:
            return 'high'
        elif confidence >= 0.4:
            return 'medium'
        else:
            return 'low'

class BiddingAnomalyDetector(BaseDetector):
    def detect(self, collection_address: str = None) -> List[Dict]:
        anomalies = []
        end_time = timezone.now()
        start_time = end_time - self.lookback_window
        
        # Get bidding transactions
        bids = NFTTransaction.objects.filter(
            timestamp__gte=start_time,
            timestamp__lte=end_time,
            transaction_type='bid'
        )
        
        if collection_address:
            bids = bids.filter(nft_contract=collection_address)
        
        # Group by NFT
        nft_bids = {}
        for bid in bids:
            nft_key = f"{bid.nft_contract}:{bid.token_id}"
            if nft_key not in nft_bids:
                nft_bids[nft_key] = []
            nft_bids[nft_key].append(bid)
        
        for nft_key, bid_list in nft_bids.items():
            if len(bid_list) < 2:
                continue
            
            # Sort by timestamp
            bid_list.sort(key=lambda x: x.timestamp)
            
            # Check for rapid bidding
            rapid_bids = 0
            for i in range(1, len(bid_list)):
                time_diff = (bid_list[i].timestamp - bid_list[i-1].timestamp).total_seconds()
                if time_diff < 60:  # Less than 1 minute between bids
                    rapid_bids += 1
            
            if rapid_bids > len(bid_list) * 0.5:  # More than 50% rapid bids
                confidence = rapid_bids / len(bid_list)
                severity = self._determine_severity(confidence)
                
                anomalies.append({
                    'type': 'bidding_anomaly',
                    'nft': nft_key,
                    'confidence': confidence,
                    'severity': severity,
                    'data': {
                        'total_bids': len(bid_list),
                        'rapid_bids': rapid_bids,
                        'rapid_bid_ratio': rapid_bids / len(bid_list),
                        'bid_details': [
                            {
                                'hash': bid.transaction_hash,
                                'bidder': bid.buyer_address,
                                'price': float(bid.price or 0),
                                'timestamp': bid.timestamp.isoformat()
                            } for bid in bid_list
                        ]
                    }
                })
        
        return anomalies
    
    def _determine_severity(self, confidence: float) -> str:
        if confidence >= 0.8:
            return 'high'
        elif confidence >= 0.6:
            return 'medium'
        else:
            return 'low'

class UserBehaviorDetector(BaseDetector):
    def detect(self, wallet_address: str = None) -> List[Dict]:
        anomalies = []
        end_time = timezone.now()
        start_time = end_time - self.lookback_window
        
        # Get user profiles to analyze
        profiles = UserBehaviorProfile.objects.all()
        if wallet_address:
            profiles = profiles.filter(wallet_address=wallet_address)
        
        for profile in profiles:
            # Get recent transactions for this user
            recent_txs = NFTTransaction.objects.filter(
                Q(buyer_address=profile.wallet_address) | Q(seller_address=profile.wallet_address),
                timestamp__gte=start_time,
                timestamp__lte=end_time
            )
            
            if not recent_txs.exists():
                continue
            
            # Calculate recent behavior metrics
            recent_volume = sum(float(tx.price or 0) for tx in recent_txs)
            recent_frequency = recent_txs.count() / (self.lookback_window.total_seconds() / 86400)  # per day
            
            # Compare with historical profile
            volume_deviation = abs(recent_volume - float(profile.avg_transaction_value)) / float(profile.avg_transaction_value) if profile.avg_transaction_value > 0 else 0
            frequency_deviation = abs(recent_frequency - profile.transaction_frequency) / profile.transaction_frequency if profile.transaction_frequency > 0 else 0
            
            # Check if deviations exceed threshold
            if volume_deviation > self.threshold or frequency_deviation > self.threshold:
                confidence = max(volume_deviation, frequency_deviation) / self.threshold
                confidence = min(confidence, 1.0)
                severity = self._determine_severity(confidence)
                
                anomalies.append({
                    'type': 'user_behavior',
                    'wallet_address': profile.wallet_address,
                    'confidence': confidence,
                    'severity': severity,
                    'data': {
                        'recent_volume': recent_volume,
                        'historical_avg_volume': float(profile.avg_transaction_value),
                        'volume_deviation': volume_deviation,
                        'recent_frequency': recent_frequency,
                        'historical_frequency': profile.transaction_frequency,
                        'frequency_deviation': frequency_deviation,
                        'risk_score': profile.risk_score
                    }
                })
        
        return anomalies
    
    def _determine_severity(self, confidence: float) -> str:
        if confidence >= 0.9:
            return 'high'
        elif confidence >= 0.7:
            return 'medium'
        else:
            return 'low'

class AnomalyDetectionEngine:
    def __init__(self):
        self.detectors = {
            'volume_spike': VolumeSpikeDetector,
            'wash_trade': WashTradingDetector,
            'bidding_anomaly': BiddingAnomalyDetector,
            'user_behavior': UserBehaviorDetector,
        }
    
    def run_detection(self, detection_type: str = None, **kwargs) -> List[Dict]:
        """Run anomaly detection for specified type or all types"""
        all_anomalies = []
        
        # Get active anomaly models
        models = AnomalyModel.objects.filter(is_active=True)
        if detection_type:
            models = models.filter(name=detection_type)
        
        for model in models:
            try:
                detector_class = self.detectors.get(model.name)
                if not detector_class:
                    logger.warning(f"No detector found for {model.name}")
                    continue
                
                detector = detector_class(model)
                anomalies = detector.detect(**kwargs)
                
                # Save anomalies to database
                for anomaly in anomalies:
                    self._save_anomaly(model, anomaly)
                
                all_anomalies.extend(anomalies)
                
            except Exception as e:
                logger.error(f"Error running detector {model.name}: {str(e)}")
        
        return all_anomalies
    
    def _save_anomaly(self, model: AnomalyModel, anomaly_data: Dict):
        """Save detected anomaly to database"""
        try:
            AnomalyDetection.objects.create(
                anomaly_model=model,
                severity=anomaly_data['severity'],
                confidence_score=anomaly_data['confidence'],
                anomaly_data=anomaly_data['data']
            )
        except Exception as e:
            logger.error(f"Error saving anomaly: {str(e)}")

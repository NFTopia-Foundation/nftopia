package com.nftopia.paymentservice.service;

import com.nftopia.paymentservice.entity.Transaction;
import com.nftopia.paymentservice.entity.TransactionStatus;
import com.nftopia.paymentservice.dto.FraudCheckResult;
import com.nftopia.paymentservice.dto.FraudRiskLevel;
import com.nftopia.paymentservice.repository.TransactionsRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
public class FraudRulesEngine {
    private final TransactionsRepository transactionsRepository;
    // Assume geoIPService and deviceFingerprintService are injected or stubbed

    public FraudRulesEngine(TransactionsRepository transactionsRepository) {
        this.transactionsRepository = transactionsRepository;
    }

    public FraudCheckResult applyRules(Transaction transaction) {
        List<String> triggeredRules = new ArrayList<>();
        FraudRiskLevel riskLevel = FraudRiskLevel.LOW;
        boolean isSuspicious = false;
        String recommendation = "ALLOW";

        // 1. Velocity Check: >5 transactions/hour from same user
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        int recentTxCount = transactionsRepository.findByUserIdAndCreatedAtAfter(
                transaction.getUserId(), oneHourAgo).size();
        if (recentTxCount > 5) {
            triggeredRules.add("Velocity Check");
            riskLevel = FraudRiskLevel.MEDIUM;
            isSuspicious = true;
            recommendation = "REVIEW";
        }

        // 2. Geo Discrepancy: IP vs billing address mismatch (stubbed)
        if (!geoMatches(transaction.getIpAddress(), transaction.getBillingAddress())) {
            triggeredRules.add("Geo Discrepancy");
            riskLevel = FraudRiskLevel.HIGH;
            isSuspicious = true;
            recommendation = "BLOCK";
        }

        // 3. Device Anomaly: New/unrecognized device (stubbed)
        if (isDeviceAnomalous(transaction.getUserId(), transaction.getDeviceId())) {
            triggeredRules.add("Device Anomaly");
            if (riskLevel.ordinal() < FraudRiskLevel.MEDIUM.ordinal())
                riskLevel = FraudRiskLevel.MEDIUM;
            isSuspicious = true;
            if (!recommendation.equals("BLOCK")) recommendation = "REVIEW";
        }

        // 4. Amount Spike: >3x average transaction amount
        double avg = getUserAverageAmount(transaction.getUserId());
        if (avg > 0 && transaction.getAmount().doubleValue() > 3 * avg) {
            triggeredRules.add("Amount Spike");
            riskLevel = FraudRiskLevel.CRITICAL;
            isSuspicious = true;
            recommendation = "REVIEW";
        }

        return new FraudCheckResult(isSuspicious, riskLevel, triggeredRules, recommendation);
    }

    private boolean geoMatches(String ip, String billingAddress) {
        // TODO: Integrate with GeoIP service
        return true;
    }

    private boolean isDeviceAnomalous(Long userId, String deviceId) {
        // TODO: Integrate with device fingerprinting
        return false;
    }

    private double getUserAverageAmount(Long userId) {
        List<Transaction> txs = transactionsRepository.findByUserId(userId);
        if (txs.isEmpty()) return 0;
        return txs.stream().mapToDouble(t -> t.getAmount().doubleValue()).average().orElse(0);
    }
} 
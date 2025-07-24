package com.nftopia.paymentservice.service.metrics;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class FraudMetricsService {
    private int totalEvaluated = 0;
    private int totalFraudulent = 0;
    private int totalFalsePositives = 0;
    private final Map<String, Integer> ruleHits = new HashMap<>();

    public synchronized void recordEvaluation(boolean isFraud, boolean isFalsePositive, java.util.List<String> rules) {
        totalEvaluated++;
        if (isFraud) totalFraudulent++;
        if (isFalsePositive) totalFalsePositives++;
        for (String rule : rules) {
            ruleHits.put(rule, ruleHits.getOrDefault(rule, 0) + 1);
        }
    }

    public int getTotalEvaluated() { return totalEvaluated; }
    public int getTotalFraudulent() { return totalFraudulent; }
    public int getTotalFalsePositives() { return totalFalsePositives; }
    public Map<String, Integer> getRuleHits() { return ruleHits; }
    public double getFraudDetectionRate() {
        return totalEvaluated == 0 ? 0 : (double) totalFraudulent / totalEvaluated;
    }
    public double getFalsePositiveRate() {
        return totalEvaluated == 0 ? 0 : (double) totalFalsePositives / totalEvaluated;
    }
} 
package com.nftopia.paymentservice.service;

import com.nftopia.paymentservice.entity.Transaction;
import com.nftopia.paymentservice.dto.FraudCheckResult;
import com.nftopia.paymentservice.repository.TransactionsRepository;
import com.nftopia.paymentservice.service.metrics.FraudMetricsService;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FraudCheckService {
    private final TransactionsRepository transactionsRepository;
    private final FraudRulesEngine rulesEngine;
    private final FraudMetricsService fraudMetricsService;

    @Async
    public FraudCheckResult evaluateTransaction(Transaction transaction) {
        FraudCheckResult result = rulesEngine.applyRules(transaction);
        // For now, assume isFalsePositive is always false (stub for future logic)
        fraudMetricsService.recordEvaluation(result.isSuspicious(), false, result.triggeredRules());
        return result;
    }
} 
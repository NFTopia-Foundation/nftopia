package com.nftopia.paymentservice.dto;

import java.util.List;

public record FraudCheckResult(
    boolean isSuspicious,
    FraudRiskLevel riskLevel,
    List<String> triggeredRules,
    String recommendation // "ALLOW", "REVIEW", "BLOCK"
) {} 
package com.nftopia.paymentservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record StarknetTransactionEvent(
    @NotBlank String txHash,
    @NotNull TransactionStatus status,
    @NotNull Instant blockTimestamp,
    @Positive Long blockNumber,
    @Valid List<StarknetEventLog> logs
) {}

public record StarknetEventLog(
    String contractAddress,
    String eventType,
    Map<String, String> data
) {} 
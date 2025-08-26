package com.nftopia.paymentservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.nftopia.paymentservice.entity.enums.TransactionStatus;

import java.time.Instant;
import java.util.UUID;

public record TransactionResponse(
    UUID id,
    TransactionStatus status,
    Instant createdAt,
    @JsonInclude(JsonInclude.Include.NON_NULL) String blockchainExplorerUrl
) {}

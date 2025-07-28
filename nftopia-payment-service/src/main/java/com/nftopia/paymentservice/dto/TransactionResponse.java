package com.nftopia.paymentservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;
import java.time.Instant;
import java.util.UUID;

public record TransactionResponse(
    UUID id,
    TransactionStatus status,
    Instant createdAt,
    @JsonInclude(Include.NON_NULL) String blockchainExplorerUrl
) {} 
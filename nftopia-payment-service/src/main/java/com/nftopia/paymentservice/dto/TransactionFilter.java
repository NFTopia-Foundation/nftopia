package com.nftopia.paymentservice.dto;

import java.util.UUID;

public record TransactionFilter(
    UUID nftId,
    UUID userId,
    String status
) {}

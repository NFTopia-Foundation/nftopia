package com.nftopia.paymentservice.dto;

import jakarta.validation.constraints.*;
import java.time.Instant;

public record EscrowDetailsDTO(
    @NotNull(message = "Escrow status is required")
    String escrowStatus,

    @Future(message = "Expiration must be in the future")
    Instant expiration,

    boolean isDisputed
) {} 
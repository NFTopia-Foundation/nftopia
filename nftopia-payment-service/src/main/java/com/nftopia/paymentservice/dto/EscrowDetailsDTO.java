package com.nftopia.paymentservice.dto;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record EscrowDetailsDTO(
    @NotNull Instant releaseDate,
    @NotNull String conditions
) {}

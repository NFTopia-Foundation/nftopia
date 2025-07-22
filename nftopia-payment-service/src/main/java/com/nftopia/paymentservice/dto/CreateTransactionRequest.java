package com.nftopia.paymentservice.dto;

import javax.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

public record CreateTransactionRequest(
    @NotNull UUID nftId,
    @NotNull UUID receiverId,
    @Positive @DecimalMin("0.00000001") BigDecimal amount,
    @NotNull PaymentMethod paymentMethod,
    @Valid EscrowDetailsDTO escrowDetails
) {} 
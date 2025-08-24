package com.nftopia.paymentservice.dto;

import java.math.BigDecimal;
import java.util.UUID;

import com.nftopia.paymentservice.entity.enums.PaymentMethod;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateTransactionRequest(
    @NotNull UUID nftId,
    @NotNull UUID receiverId, // buyer
    @NotNull UUID auctionId,
    @NotBlank String transactionHash,
    @Positive @DecimalMin("0.00000001") BigDecimal amount,
    @NotNull PaymentMethod paymentMethod,
    @Valid EscrowDetailsDTO escrowDetails,
    @NotBlank String idempotencyKey
) {}


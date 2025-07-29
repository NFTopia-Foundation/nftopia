package com.nftopia.paymentservice.service;

import com.nftopia.paymentservice.dto.*;
import org.springframework.data.domain.Page;

import java.util.UUID;

public interface TransactionService {
    TransactionResponse createTransaction(CreateTransactionRequest request, String idempotencyKey);
    TransactionResponse getTransaction(UUID id);
    Page<TransactionResponse> getTransactions(UUID nftId, UUID userId, TransactionStatus status, int page, int size);
    TransactionResponse updateEscrowStatus(UUID id, EscrowDetailsDTO escrowDetails);
} 
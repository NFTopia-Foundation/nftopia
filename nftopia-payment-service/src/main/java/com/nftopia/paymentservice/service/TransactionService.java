package com.nftopia.paymentservice.service;

import com.nftopia.paymentservice.dto.CreateTransactionRequest;
import com.nftopia.paymentservice.dto.EscrowDetailsDTO;
import com.nftopia.paymentservice.dto.TransactionFilter;
import com.nftopia.paymentservice.dto.TransactionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface TransactionService {
    TransactionResponse createTransaction(CreateTransactionRequest request);
    TransactionResponse getTransaction(UUID id);
    Page<TransactionResponse> filterTransactions(TransactionFilter filter, Pageable pageable);
    TransactionResponse updateEscrow(UUID id, EscrowDetailsDTO escrowDetails);
}

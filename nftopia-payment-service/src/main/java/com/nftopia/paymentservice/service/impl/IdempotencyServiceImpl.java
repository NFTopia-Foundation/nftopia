package com.nftopia.paymentservice.service.impl;

import com.nftopia.paymentservice.repository.TransactionRepository;
import com.nftopia.paymentservice.dto.TransactionResponse;
import com.nftopia.paymentservice.entity.Transaction;
import com.nftopia.paymentservice.utils.ExplorerUrlBuilder;
import com.nftopia.paymentservice.service.IdempotencyService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import java.util.Optional;


import java.util.function.Supplier;

@Service
public class IdempotencyServiceImpl implements IdempotencyService {

    private final TransactionRepository transactionRepository;
    private final ExplorerUrlBuilder explorerUrlBuilder;

    public IdempotencyServiceImpl(TransactionRepository transactionRepository, ExplorerUrlBuilder explorerUrlBuilder) {
        this.transactionRepository = transactionRepository;
        this.explorerUrlBuilder = explorerUrlBuilder;
    }

   

    @Override
    public <T> T execute(String key, Supplier<T> supplier) {
    // First, check if transaction with this idempotencyKey already exists
    Optional<Transaction> existing = transactionRepository.findByIdempotencyKey(key);
    if (existing.isPresent()) {
        // Return mapped response instead of error
        return (T) this.toResponse(existing.get());
    }

    try {
        return supplier.get();
    } catch (DataIntegrityViolationException e) {
        // Race condition fallback: re-fetch and return
        return (T) transactionRepository.findByIdempotencyKey(key)
                .map(this::toResponse)
                .orElseThrow(() -> e); // Should not happen unless DB corrupt
    }
}


 private TransactionResponse toResponse(Transaction t) {
        String explorerUrl = t.getTransactionHash() == null ? null : explorerUrlBuilder.tx(t.getTransactionHash());
        return new TransactionResponse(t.getId(), t.getStatus(), t.getCreatedAt(), explorerUrl);
    }

}

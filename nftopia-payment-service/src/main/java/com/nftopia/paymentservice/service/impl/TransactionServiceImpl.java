package com.nftopia.paymentservice.service.impl;

import com.nftopia.paymentservice.dto.*;
import com.nftopia.paymentservice.entity.Transaction;
import com.nftopia.paymentservice.entity.IdempotencyKey;
import com.nftopia.paymentservice.repository.TransactionRepository;
import com.nftopia.paymentservice.repository.IdempotencyKeyRepository;
import com.nftopia.paymentservice.service.TransactionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import com.nftopia.paymentservice.exception.TransactionNotFoundException;
import com.nftopia.paymentservice.exception.EscrowUpdateException;

@Service
public class TransactionServiceImpl implements TransactionService {
    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private IdempotencyKeyRepository idempotencyKeyRepository;
    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public TransactionResponse createTransaction(CreateTransactionRequest request, String idempotencyKey) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            String requestHash = Integer.toHexString(request.hashCode());
            IdempotencyKey existing = idempotencyKeyRepository.findById(idempotencyKey).orElse(null);
            if (existing != null) {
                if (!existing.getRequestHash().equals(requestHash)) {
                    throw new IllegalArgumentException("Idempotency-Key reuse with different request body");
                }
                try {
                    return objectMapper.readValue(existing.getResponseJson(), TransactionResponse.class);
                } catch (Exception e) {
                    throw new RuntimeException("Failed to deserialize idempotent response");
                }
            }
            // Not found, proceed and store
            Transaction transaction = new Transaction();
            transaction.setNftId(request.nftId());
            transaction.setReceiverId(request.receiverId());
            transaction.setAmount(request.amount());
            transaction.setPaymentMethod(request.paymentMethod());
            transaction.setStatus(TransactionStatus.PENDING);
            transaction.setCreatedAt(Instant.now());
            transaction.setUpdatedAt(Instant.now());
            transaction = transactionRepository.save(transaction);
            TransactionResponse response = toResponse(transaction);
            try {
                String responseJson = objectMapper.writeValueAsString(response);
                IdempotencyKey key = new IdempotencyKey(idempotencyKey, requestHash, responseJson, Instant.now());
                idempotencyKeyRepository.save(key);
            } catch (Exception e) {
                // Log and continue
            }
            return response;
        } else {
            // No idempotency key, process normally
            Transaction transaction = new Transaction();
            transaction.setNftId(request.nftId());
            transaction.setReceiverId(request.receiverId());
            transaction.setAmount(request.amount());
            transaction.setPaymentMethod(request.paymentMethod());
            transaction.setStatus(TransactionStatus.PENDING);
            transaction.setCreatedAt(Instant.now());
            transaction.setUpdatedAt(Instant.now());
            transaction = transactionRepository.save(transaction);
            return toResponse(transaction);
        }
    }

    @Override
    public TransactionResponse getTransaction(UUID id) {
        Optional<Transaction> transaction = transactionRepository.findById(id);
        if (transaction.isEmpty()) {
            throw new TransactionNotFoundException("Transaction not found");
        }
        return toResponse(transaction.get());
    }

    @Override
    public Page<TransactionResponse> getTransactions(UUID nftId, UUID userId, TransactionStatus status, int page, int size) {
        Page<Transaction> transactions;
        if (nftId != null && userId != null && status != null) {
            // TODO: Implement combined query if needed
            transactions = transactionRepository.findAll(PageRequest.of(page, size)).map(t -> t)
                .filter(t -> t.getNftId().equals(nftId) && t.getReceiverId().equals(userId) && t.getStatus() == status);
        } else if (nftId != null && userId != null) {
            transactions = transactionRepository.findByNftIdAndReceiverId(nftId, userId, PageRequest.of(page, size));
        } else if (nftId != null && status != null) {
            transactions = transactionRepository.findByNftId(nftId, PageRequest.of(page, size)).map(t -> t)
                .filter(t -> t.getStatus() == status);
        } else if (userId != null && status != null) {
            transactions = transactionRepository.findByReceiverId(userId, PageRequest.of(page, size)).map(t -> t)
                .filter(t -> t.getStatus() == status);
        } else if (nftId != null) {
            transactions = transactionRepository.findByNftId(nftId, PageRequest.of(page, size));
        } else if (userId != null) {
            transactions = transactionRepository.findByReceiverId(userId, PageRequest.of(page, size));
        } else if (status != null) {
            transactions = transactionRepository.findByStatus(status, PageRequest.of(page, size));
        } else {
            transactions = transactionRepository.findAll(PageRequest.of(page, size));
        }
        return transactions.map(this::toResponse);
    }

    @Override
    public TransactionResponse updateEscrowStatus(UUID id, EscrowDetailsDTO escrowDetails) {
        Optional<Transaction> transactionOpt = transactionRepository.findById(id);
        if (transactionOpt.isEmpty()) {
            throw new TransactionNotFoundException("Transaction not found");
        }
        Transaction transaction = transactionOpt.get();
        try {
            transaction.setEscrowStatus(escrowDetails.escrowStatus());
            transaction.setEscrowExpiration(escrowDetails.expiration());
            transaction.setDisputed(escrowDetails.isDisputed());
            transaction.setStatus(TransactionStatus.ESCROW);
            transaction.setUpdatedAt(Instant.now());
            transaction = transactionRepository.save(transaction);
            return toResponse(transaction);
        } catch (Exception e) {
            throw new EscrowUpdateException("Failed to update escrow status: " + e.getMessage());
        }
    }

    private TransactionResponse toResponse(Transaction transaction) {
        return new TransactionResponse(
                transaction.getId(),
                transaction.getStatus(),
                transaction.getCreatedAt(),
                null // TODO: Set blockchainExplorerUrl if available
        );
    }
} 
package com.nftopia.paymentservice.repository;

import com.nftopia.paymentservice.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID>, JpaSpecificationExecutor<Transaction> {
    Optional<Transaction> findByTransactionHash(String transactionHash);
    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);
}

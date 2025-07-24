package com.nftopia.paymentservice.repository;

import com.nftopia.paymentservice.entity.Transaction;
import com.nftopia.paymentservice.entity.TransactionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionsRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserId(Long userId);
    List<Transaction> findByStatus(TransactionStatus status);
    List<Transaction> findByUserIdAndCreatedAtAfter(Long userId, java.time.LocalDateTime after);
    List<Transaction> findByDeviceIdAndCreatedAtAfter(String deviceId, java.time.LocalDateTime after);
} 
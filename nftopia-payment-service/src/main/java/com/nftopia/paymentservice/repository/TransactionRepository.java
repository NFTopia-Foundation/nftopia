package com.nftopia.paymentservice.repository;

import com.nftopia.paymentservice.entity.Transaction;
import com.nftopia.paymentservice.dto.TransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    Page<Transaction> findByNftId(UUID nftId, Pageable pageable);
    Page<Transaction> findByReceiverId(UUID receiverId, Pageable pageable);
    Page<Transaction> findByStatus(TransactionStatus status, Pageable pageable);
    Page<Transaction> findByNftIdAndReceiverId(UUID nftId, UUID receiverId, Pageable pageable);
    // Add more custom queries as needed
} 
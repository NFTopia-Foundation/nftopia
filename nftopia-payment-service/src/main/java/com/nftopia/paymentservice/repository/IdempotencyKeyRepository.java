package com.nftopia.paymentservice.repository;

import com.nftopia.paymentservice.entity.IdempotencyKey;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IdempotencyKeyRepository extends JpaRepository<IdempotencyKey, String> {
} 
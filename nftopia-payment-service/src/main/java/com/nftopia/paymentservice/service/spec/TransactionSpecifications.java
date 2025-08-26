package com.nftopia.paymentservice.service.spec;

import com.nftopia.paymentservice.entity.Transaction;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public class TransactionSpecifications {

    public static Specification<Transaction> hasNftId(UUID nftId) {
        return (root, query, cb) -> cb.equal(root.get("nft").get("id"), nftId);
    }

    public static Specification<Transaction> hasUserId(UUID userId) {
        return (root, query, cb) -> cb.or(
                cb.equal(root.get("buyer").get("id"), userId),
                cb.equal(root.get("seller").get("id"), userId)
        );
    }

    public static Specification<Transaction> hasStatus(String status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }
}


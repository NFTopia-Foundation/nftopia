package com.nftopia.paymentservice.entity;

import javax.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "idempotency_keys")
public class IdempotencyKey {
    @Id
    private String key;

    @Column(nullable = false)
    private String requestHash;

    @Lob
    @Column(nullable = false)
    private String responseJson;

    @Column(nullable = false)
    private Instant createdAt;

    public IdempotencyKey() {}
    public IdempotencyKey(String key, String requestHash, String responseJson, Instant createdAt) {
        this.key = key;
        this.requestHash = requestHash;
        this.responseJson = responseJson;
        this.createdAt = createdAt;
    }
    // Getters and setters omitted for brevity
} 
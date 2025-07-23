package com.nftopia.paymentservice.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "idempotency_keys")
public class IdempotencyKey {
    @Id
    @Column(name = "idempotency_key", nullable = false, unique = true)
    private String idempotencyKey;

    @Column(nullable = false)
    private String requestHash;

    @Lob
    @Column(nullable = false)
    private String responseJson;

    @Column(nullable = false)
    private Instant createdAt;

    public IdempotencyKey() {}
    public IdempotencyKey(String idempotencyKey, String requestHash, String responseJson, Instant createdAt) {
        this.idempotencyKey = idempotencyKey;
        this.requestHash = requestHash;
        this.responseJson = responseJson;
        this.createdAt = createdAt;
    }
    // Getters and setters
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public String getRequestHash() { return requestHash; }
    public void setRequestHash(String requestHash) { this.requestHash = requestHash; }
    public String getResponseJson() { return responseJson; }
    public void setResponseJson(String responseJson) { this.responseJson = responseJson; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
} 
package com.nftopia.paymentservice.entity;

import com.vladmihalcea.hibernate.type.json.JsonBinaryType;
import com.nftopia.paymentservice.entity.enums.PaymentMethod;
import com.nftopia.paymentservice.entity.enums.TransactionStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "transaction", schema = "nftopia_payment_service",
       indexes = {
           @Index(name = "idx_transaction_status", columnList = "status"),
           @Index(name = "idx_transaction_nft_id", columnList = "nftId"),
           @Index(name = "idx_transaction_created_at", columnList = "createdAt")
       },
       uniqueConstraints = {
           @UniqueConstraint(name = "uk_transaction_idempotency_key", columnNames = {"idempotencyKey"})
       }
)
public class Transaction {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID buyerId;

    @Column(nullable = false)
    private UUID sellerId;

    @Column(nullable = false)
    private UUID nftId;

    @Column(nullable = false)
    private UUID auctionId;

    @Column(nullable = false, precision = 36, scale = 18)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod paymentMethod;

    @Column(nullable = false, unique = true)
    private String transactionHash; 

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionStatus status = TransactionStatus.PENDING;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> escrowDetails;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> royaltySplit;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> fraudMetadata;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(nullable = false, length = 64)
    private String idempotencyKey;

    @PreUpdate
    public void touch() {
        this.updatedAt = Instant.now();
    }

    public Transaction() {
        }

    public UUID getId() {
        return this.id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getBuyerId() {
        return this.buyerId;
    }

    public void setBuyerId(UUID buyerId) {
        this.buyerId = buyerId;
    }

    public UUID getSellerId() {
        return this.sellerId;
    }

    public void setSellerId(UUID sellerId) {
        this.sellerId = sellerId;
    }

    public UUID getNftId() {
        return this.nftId;
    }

    public void setNftId(UUID nftId) {
        this.nftId = nftId;
    }

    public UUID getAuctionId() {
        return this.auctionId;
    }

    public void setAuctionId(UUID auctionId) {
        this.auctionId = auctionId;
    }

    public BigDecimal getAmount() {
        return this.amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public PaymentMethod getPaymentMethod() {
        return this.paymentMethod;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getTransactionHash() {
        return this.transactionHash;
    }

    public void setTransactionHash(String transactionHash) {
        this.transactionHash = transactionHash;
    }

    public TransactionStatus getStatus() {
        return this.status;
    }

    public void setStatus(TransactionStatus status) {
        this.status = status;
    }

    public Map<String,Object> getEscrowDetails() {
        return this.escrowDetails;
    }

    public void setEscrowDetails(Map<String,Object> escrowDetails) {
        this.escrowDetails = escrowDetails;
    }

    public Map<String,Object> getRoyaltySplit() {
        return this.royaltySplit;
    }

    public void setRoyaltySplit(Map<String,Object> royaltySplit) {
        this.royaltySplit = royaltySplit;
    }

    public Map<String,Object> getFraudMetadata() {
        return this.fraudMetadata;
    }

    public void setFraudMetadata(Map<String,Object> fraudMetadata) {
        this.fraudMetadata = fraudMetadata;
    }

    public Instant getCreatedAt() {
        return this.createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return this.updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getIdempotencyKey() {
        return this.idempotencyKey;
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

}

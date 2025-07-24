package com.nftopia.paymentservice.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;


@Entity
@Table(name = "transactions")
public class Transaction {
    @Id

    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private UUID nftId;

    @Column(nullable = false)
    private UUID receiverId;

    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;


    @Column(nullable = false)
    private BigDecimal amount;


    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private com.nftopia.paymentservice.dto.PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private com.nftopia.paymentservice.dto.TransactionStatus status;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @Column
    private String escrowStatus;

    @Column
    private Instant escrowExpiration;

    @Column
    private boolean isDisputed;

    // Getters and setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getNftId() { return nftId; }
    public void setNftId(UUID nftId) { this.nftId = nftId; }
    public UUID getReceiverId() { return receiverId; }
    public void setReceiverId(UUID receiverId) { this.receiverId = receiverId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public com.nftopia.paymentservice.dto.PaymentMethod getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(com.nftopia.paymentservice.dto.PaymentMethod paymentMethod) { this.paymentMethod = paymentMethod; }
    public com.nftopia.paymentservice.dto.TransactionStatus getStatus() { return status; }
    public void setStatus(com.nftopia.paymentservice.dto.TransactionStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    public String getEscrowStatus() { return escrowStatus; }
    public void setEscrowStatus(String escrowStatus) { this.escrowStatus = escrowStatus; }
    public Instant getEscrowExpiration() { return escrowExpiration; }
    public void setEscrowExpiration(Instant escrowExpiration) { this.escrowExpiration = escrowExpiration; }
    public boolean isDisputed() { return isDisputed; }
    public void setDisputed(boolean disputed) { isDisputed = disputed; }

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false)
    private String deviceId;

    @Column(nullable = false)
    private String ipAddress;

    @Column(nullable = false)
    private String billingAddress;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TransactionStatus status;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Getters and setters omitted for brevity

} 
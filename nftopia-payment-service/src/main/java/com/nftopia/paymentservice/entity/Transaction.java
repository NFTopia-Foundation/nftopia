package com.nftopia.paymentservice.entity;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

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

    // Getters and setters omitted for brevity
    public String getEscrowStatus() { return escrowStatus; }
    public void setEscrowStatus(String escrowStatus) { this.escrowStatus = escrowStatus; }
    public Instant getEscrowExpiration() { return escrowExpiration; }
    public void setEscrowExpiration(Instant escrowExpiration) { this.escrowExpiration = escrowExpiration; }
    public boolean isDisputed() { return isDisputed; }
    public void setDisputed(boolean disputed) { isDisputed = disputed; }
} 
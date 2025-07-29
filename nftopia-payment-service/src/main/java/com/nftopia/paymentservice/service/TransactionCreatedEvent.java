package com.nftopia.paymentservice.service;

import com.nftopia.paymentservice.entity.Transaction;

public class TransactionCreatedEvent {
    private final Transaction transaction;

    public TransactionCreatedEvent(Transaction transaction) {
        this.transaction = transaction;
    }

    public Transaction getTransaction() {
        return transaction;
    }
} 
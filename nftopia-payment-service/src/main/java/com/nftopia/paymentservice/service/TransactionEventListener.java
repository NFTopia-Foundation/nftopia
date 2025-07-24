package com.nftopia.paymentservice.service;

import com.nftopia.paymentservice.entity.Transaction;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class TransactionEventListener {
    private final FraudCheckService fraudCheckService;

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void onTransactionCreated(TransactionCreatedEvent event) {
        fraudCheckService.evaluateTransaction(event.getTransaction());
    }
}

// You will need to define TransactionCreatedEvent with a getTransaction() method. 
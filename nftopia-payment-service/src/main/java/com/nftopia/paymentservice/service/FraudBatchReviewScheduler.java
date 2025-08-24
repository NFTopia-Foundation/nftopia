// package com.nftopia.paymentservice.service;

// import com.nftopia.paymentservice.entity.Transaction;
// import com.nftopia.paymentservice.entity.TransactionStatus;
// import com.nftopia.paymentservice.repository.TransactionsRepository;
// import lombok.RequiredArgsConstructor;
// import org.springframework.scheduling.annotation.Scheduled;
// import org.springframework.stereotype.Component;

// @Component
// @RequiredArgsConstructor
// public class FraudBatchReviewScheduler {
//     private final TransactionsRepository transactionsRepository;
//     private final FraudCheckService fraudCheckService;

//     @Scheduled(cron = "0 0/15 * * * ?")
//     public void reviewPendingTransactions() {
//         transactionsRepository.findByStatus(TransactionStatus.PENDING)
//             .forEach(fraudCheckService::evaluateTransaction);
//     }
// } 
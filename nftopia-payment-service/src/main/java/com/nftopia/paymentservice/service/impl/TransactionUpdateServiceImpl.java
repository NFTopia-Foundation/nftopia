package com.nftopia.paymentservice.service.impl;

import com.nftopia.paymentservice.dto.StarknetTransactionEvent;
import com.nftopia.paymentservice.service.TransactionUpdateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.nftopia.paymentservice.repository.TransactionRepository;

@Service
public class TransactionUpdateServiceImpl implements TransactionUpdateService {

    private static final Logger log = LoggerFactory.getLogger(TransactionUpdateServiceImpl.class);

     private final TransactionRepository transactionRepository;

      public TransactionUpdateServiceImpl(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    @Override
    @Transactional
    public void updateTransactionStatus(StarknetTransactionEvent event) {
      
        transactionRepository.findByTransactionHash(event.getTxHash()).ifPresentOrElse(
            tx -> {
                if (!tx.getStatus().equals(event.getStatus())) {
                    tx.setStatus(event.getStatus());
                    transactionRepository.save(tx);
                    log.info("Updated transaction txHash={} to status={}", event.getTxHash(), event.getStatus());
                } else {
                    log.debug("Transaction txHash={} already has status={}, skipping save.", event.getTxHash(), event.getStatus());
                }
            },
            () -> {
                log.warn("Transaction with hash={} not found in DB. Skipping update.", event.getTxHash());
            });
    }
}

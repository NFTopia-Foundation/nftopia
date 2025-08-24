package com.nftopia.paymentservice.service.impl;

import com.nftopia.paymentservice.dto.StarknetTransactionEvent;
import com.nftopia.paymentservice.service.SignatureVerifier;
import com.nftopia.paymentservice.service.TransactionUpdateService;
import com.nftopia.paymentservice.service.WebhookProcessorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class WebhookProcessorServiceImpl implements WebhookProcessorService {

    private static final Logger log = LoggerFactory.getLogger(WebhookProcessorServiceImpl.class);

    private final SignatureVerifier signatureVerifier;
    private final TransactionUpdateService transactionUpdateService;

    public WebhookProcessorServiceImpl(SignatureVerifier signatureVerifier,
                                       TransactionUpdateService transactionUpdateService) {
        this.signatureVerifier = signatureVerifier;
        this.transactionUpdateService = transactionUpdateService;
    }

    @Override
    public void verifyAndProcess(String signature, StarknetTransactionEvent event) {
        if (!signatureVerifier.verify(signature, event)) {
            throw new SecurityException("Invalid webhook signature");
        }
        processEventAsync(event);
    }

   
    protected void processEventAsync(StarknetTransactionEvent event) {
        try {
            transactionUpdateService.updateTransactionStatus(event);
            log.info("Processed webhook txHash={} status={}", event.getTxHash(), event.getStatus());
        } catch (Exception e) {
            log.error("Failed to process webhook txHash={}", event.getTxHash(), e);
            // Retry mechanism can be plugged in (Spring Retry, RabbitMQ, Kafka, etc.)
        }
    }
}

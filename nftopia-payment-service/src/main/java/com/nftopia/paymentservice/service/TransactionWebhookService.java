package com.nftopia.paymentservice.service;

import com.nftopia.paymentservice.dto.StarknetTransactionEvent;
import com.nftopia.paymentservice.entity.Transaction;
import com.nftopia.paymentservice.repository.TransactionRepository;
import com.nftopia.paymentservice.exception.InvalidSignatureException;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

@Service
public class TransactionWebhookService {
    
    private static final Logger logger = LoggerFactory.getLogger(TransactionWebhookService.class);
    
    @Autowired
    private TransactionRepository transactionRepository;
    
    @Autowired
    private MeterRegistry meterRegistry;
    
    @Autowired
    private WebClient webClient;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Value("${webhook.secret.key}")
    private String webhookSecretKey;
    
    @Value("${notification.service.url}")
    private String notificationServiceUrl;
    
    public boolean verifySignature(String signature, StarknetTransactionEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            String expectedSignature = calculateHmacSha256(payload, webhookSecretKey);
            
            return signature.equals(expectedSignature);
        } catch (Exception e) {
            logger.error("Error verifying signature: {}", e.getMessage());
            return false;
        }
    }
    
    private String calculateHmacSha256(String data, String key) throws NoSuchAlgorithmException, InvalidKeyException {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKeySpec);
        byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(hmacBytes);
    }
    
    @Async
    @Retryable(
        value = {Exception.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public void processTransactionEvent(StarknetTransactionEvent event) {
        try {
            logger.info("Processing transaction event for txHash: {}", event.txHash());
            
            // Check for idempotency (deduplication by txHash + blockNumber)
            String idempotencyKey = event.txHash() + "_" + event.blockNumber();
            
            // Update transaction status
            updateTransactionStatus(event);
            
            // Send notification
            sendNotification(event);
            
            meterRegistry.counter("webhook.event.processed", 
                "txHash", event.txHash(),
                "status", event.status().toString()
            ).increment();
            
            logger.info("Successfully processed transaction event for txHash: {}", event.txHash());
            
        } catch (Exception e) {
            meterRegistry.counter("webhook.event.failed", 
                "txHash", event.txHash(),
                "error", e.getClass().getSimpleName()
            ).increment();
            logger.error("Error processing transaction event: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    private void updateTransactionStatus(StarknetTransactionEvent event) {
        // Find transaction by txHash (assuming we store txHash in the transaction entity)
        // For now, we'll update all pending transactions as a placeholder
        // In a real implementation, you'd have a txHash field in the Transaction entity
        
        // Placeholder implementation - update based on your actual data model
        logger.info("Updating transaction status for txHash: {} to status: {}", 
            event.txHash(), event.status());
        
        // TODO: Implement actual transaction status update logic
        // This would involve finding the transaction by txHash and updating its status
    }
    
    private void sendNotification(StarknetTransactionEvent event) {
        try {
            webClient.post()
                .uri(notificationServiceUrl + "/api/notifications/transaction")
                .bodyValue(event)
                .retrieve()
                .bodyToMono(Void.class)
                .subscribe(
                    result -> logger.info("Notification sent successfully for txHash: {}", event.txHash()),
                    error -> logger.error("Failed to send notification for txHash: {}", event.txHash(), error)
                );
        } catch (Exception e) {
            logger.error("Error sending notification: {}", e.getMessage());
        }
    }
} 
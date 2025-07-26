package com.nftopia.paymentservice.controller;

import com.nftopia.paymentservice.dto.StarknetTransactionEvent;
import com.nftopia.paymentservice.service.TransactionWebhookService;
import com.nftopia.paymentservice.config.RateLimitConfig;
import com.nftopia.paymentservice.exception.InvalidSignatureException;
import com.nftopia.paymentservice.exception.RateLimitExceededException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.http.ProblemDetail;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import io.micrometer.core.annotation.Timed;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/transactions/webhook")
@Tag(name = "Transaction Webhook", description = "Webhook endpoint for Starknet transaction events")
public class TransactionWebhookController {
    
    private static final Logger logger = LoggerFactory.getLogger(TransactionWebhookController.class);
    
    @Autowired
    private TransactionWebhookService webhookService;
    
    @Autowired
    private RateLimitConfig rateLimitConfig;
    
    @Autowired
    private MeterRegistry meterRegistry;

    @Operation(summary = "Handle Starknet transaction event")
    @PostMapping
    @Timed(value = "webhook.processing.time", description = "Time taken to process webhook")
    public ResponseEntity<Void> handleTransactionEvent(
            @RequestHeader("X-Starknet-Signature") String signature,
            @Valid @RequestBody StarknetTransactionEvent event) {
        
        try {
            // Rate limiting check
            if (!rateLimitConfig.allowRequest()) {
                meterRegistry.counter("webhook.rate.limited").increment();
                throw new RateLimitExceededException("Rate limit exceeded");
            }
            
            // Verify signature
            if (!webhookService.verifySignature(signature, event)) {
                meterRegistry.counter("webhook.invalid.signature").increment();
                throw new InvalidSignatureException("Invalid signature");
            }
            
            // Process event asynchronously
            webhookService.processTransactionEvent(event);
            
            meterRegistry.counter("webhook.processed").increment();
            logger.info("Webhook event processed successfully for txHash: {}", event.txHash());
            
            return ResponseEntity.accepted().build();
            
        } catch (InvalidSignatureException | RateLimitExceededException e) {
            logger.warn("Webhook request rejected: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            meterRegistry.counter("webhook.error").increment();
            logger.error("Error processing webhook event: {}", e.getMessage(), e);
            throw new RuntimeException("Internal server error", e);
        }
    }
}

@RestControllerAdvice
class WebhookControllerAdvice {
    
    @ExceptionHandler(InvalidSignatureException.class)
    public ResponseEntity<ProblemDetail> handleInvalidSignature(InvalidSignatureException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.UNAUTHORIZED);
        problem.setTitle("Invalid Signature");
        problem.setDetail(ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }
    
    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ProblemDetail> handleRateLimit(RateLimitExceededException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.TOO_MANY_REQUESTS);
        problem.setTitle("Rate Limit Exceeded");
        problem.setDetail(ex.getMessage());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(problem);
    }
} 
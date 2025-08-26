package com.nftopia.paymentservice.controller;

import com.nftopia.paymentservice.dto.StarknetTransactionEvent;
import com.nftopia.paymentservice.service.WebhookProcessorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/transactions/webhook")
public class TransactionWebhookController {

    private static final Logger log = LoggerFactory.getLogger(TransactionWebhookController.class);
    private final WebhookProcessorService webhookProcessorService;

    public TransactionWebhookController(WebhookProcessorService webhookProcessorService) {
        this.webhookProcessorService = webhookProcessorService;
    }

    @PostMapping
    public ResponseEntity<String> handleTransactionEvent(
            @RequestHeader("X-Starknet-Signature") String signature,
            @Valid @RequestBody StarknetTransactionEvent event) {

        try {
            log.info("Signature: {}", signature);
            log.info("Event: {}", event);
            webhookProcessorService.verifyAndProcess(signature, event);
            return ResponseEntity.accepted().body("Webhook accepted");
        } catch (Exception e) {
            log.error("Webhook processing failed", e);
            // Only return the exception message
            String message = e.getMessage() != null ? e.getMessage() : "Internal server error";
            return ResponseEntity.status(500).body(message);
        }
    }
}



/// Test on Postman
/// Authorization: Username: admin, Password: secret    
/// POST /api/transactions/webhook
// Headers: X-Starknet-Signature: valid_signature_here
// Body:{
//   "txHash": "0xabc123456789",
//   "status": "COMPLETED",
//   "blockTimestamp": "2025-08-24T00:00:00Z",
//   "blockNumber": 123456,
//   "logs": [
//     {
//       "eventName": "Transfer",
//       "data": {
//         "from": "0xabc123",
//         "to": "0xdef456",
//         "amount": "1000"
//       }
//     },
//     {
//       "eventName": "Approval",
//       "data": {
//         "owner": "0xabc123",
//         "spender": "0xdef456",
//         "amount": "500"
//       }
//     }
//   ]
// }

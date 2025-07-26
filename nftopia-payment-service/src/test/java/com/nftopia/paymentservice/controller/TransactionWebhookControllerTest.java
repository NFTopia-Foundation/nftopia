package com.nftopia.paymentservice.controller;

import com.nftopia.paymentservice.dto.StarknetTransactionEvent;
import com.nftopia.paymentservice.dto.StarknetEventLog;
import com.nftopia.paymentservice.dto.TransactionStatus;
import com.nftopia.paymentservice.service.TransactionWebhookService;
import com.nftopia.paymentservice.config.RateLimitConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.result.MockMvcResultMatchers;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@WebMvcTest(TransactionWebhookController.class)
public class TransactionWebhookControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private TransactionWebhookService webhookService;
    
    @MockBean
    private RateLimitConfig rateLimitConfig;
    
    @MockBean
    private MeterRegistry meterRegistry;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Test
    public void testHandleTransactionEvent_Success() throws Exception {
        // Given
        StarknetTransactionEvent event = new StarknetTransactionEvent(
            "0x1234567890abcdef",
            TransactionStatus.COMPLETED,
            Instant.now(),
            12345L,
            List.of(new StarknetEventLog("0xcontract", "Transfer", Map.of("from", "0x123", "to", "0x456")))
        );
        
        when(rateLimitConfig.allowRequest()).thenReturn(true);
        when(webhookService.verifySignature(any(), any())).thenReturn(true);
        
        // When & Then
        mockMvc.perform(MockMvcRequestBuilders.post("/api/transactions/webhook")
                .header("X-Starknet-Signature", "valid-signature")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(event)))
                .andExpect(MockMvcResultMatchers.status().isAccepted());
    }
    
    @Test
    public void testHandleTransactionEvent_InvalidSignature() throws Exception {
        // Given
        StarknetTransactionEvent event = new StarknetTransactionEvent(
            "0x1234567890abcdef",
            TransactionStatus.COMPLETED,
            Instant.now(),
            12345L,
            List.of()
        );
        
        when(rateLimitConfig.allowRequest()).thenReturn(true);
        when(webhookService.verifySignature(any(), any())).thenReturn(false);
        
        // When & Then
        mockMvc.perform(MockMvcRequestBuilders.post("/api/transactions/webhook")
                .header("X-Starknet-Signature", "invalid-signature")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(event)))
                .andExpect(MockMvcResultMatchers.status().isUnauthorized());
    }
    
    @Test
    public void testHandleTransactionEvent_RateLimitExceeded() throws Exception {
        // Given
        StarknetTransactionEvent event = new StarknetTransactionEvent(
            "0x1234567890abcdef",
            TransactionStatus.COMPLETED,
            Instant.now(),
            12345L,
            List.of()
        );
        
        when(rateLimitConfig.allowRequest()).thenReturn(false);
        
        // When & Then
        mockMvc.perform(MockMvcRequestBuilders.post("/api/transactions/webhook")
                .header("X-Starknet-Signature", "valid-signature")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(event)))
                .andExpect(MockMvcResultMatchers.status().isTooManyRequests());
    }
} 
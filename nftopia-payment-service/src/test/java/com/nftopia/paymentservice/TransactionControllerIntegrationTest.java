package com.nftopia.paymentservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nftopia.paymentservice.dto.CreateTransactionRequest;
import com.nftopia.paymentservice.dto.EscrowDetailsDTO;
import com.nftopia.paymentservice.dto.PaymentMethod;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.context.annotation.Import;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Import(TestSecurityConfig.class)
@SpringBootTest
@AutoConfigureMockMvc
public class TransactionControllerIntegrationTest {
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void createTransaction_happyPath() throws Exception {
        CreateTransactionRequest req = new CreateTransactionRequest(
                UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("1.23"), PaymentMethod.CRYPTO, null);
        mockMvc.perform(post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists());
    }

    @Test
    void createTransaction_invalidAmount() throws Exception {
        CreateTransactionRequest req = new CreateTransactionRequest(
                UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("0.0"), PaymentMethod.CRYPTO, null);
        mockMvc.perform(post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void createTransaction_idempotency() throws Exception {
        CreateTransactionRequest req = new CreateTransactionRequest(
                UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("2.34"), PaymentMethod.CRYPTO, null);
        String body = objectMapper.writeValueAsString(req);
        String key = UUID.randomUUID().toString();
        mockMvc.perform(post("/api/transactions")
                .header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/transactions")
                .header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isCreated());
    }

    @Test
    void getTransaction_notFound() throws Exception {
        mockMvc.perform(get("/api/transactions/" + UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }

    @Test
    void filterTransactions_happyPath() throws Exception {
        mockMvc.perform(get("/api/transactions"))
                .andExpect(status().isOk());
    }

    @Test
    void updateEscrowStatus_happyPath() throws Exception {
        // First, create a transaction
        CreateTransactionRequest req = new CreateTransactionRequest(
                UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("3.45"), PaymentMethod.CRYPTO, null);
        String response = mockMvc.perform(post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(response).get("id").asText();
        // Now, update escrow
        mockMvc.perform(patch("/api/transactions/" + id + "/escrow")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new EscrowDetailsDTO("PENDING", Instant.now().plusSeconds(3600), false)
                )))
                .andExpect(status().isOk());
    }

    @Test
    void createTransaction_largeAmount() throws Exception {
        CreateTransactionRequest req = new CreateTransactionRequest(
                UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("1000000000.12345678"), PaymentMethod.CRYPTO, null);
        mockMvc.perform(post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists());
    }
} 
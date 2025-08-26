// package com.nftopia.paymentservice;

// import com.nftopia.paymentservice.dto.FraudCheckResult;
// import com.nftopia.paymentservice.dto.FraudRiskLevel;
// import com.nftopia.paymentservice.entity.Transaction;
// import com.nftopia.paymentservice.entity.TransactionStatus;
// import com.nftopia.paymentservice.repository.TransactionsRepository;
// import com.nftopia.paymentservice.service.FraudRulesEngine;
// import org.junit.jupiter.api.BeforeEach;
// import org.junit.jupiter.api.Test;
// import org.mockito.Mockito;

// import java.math.BigDecimal;
// import java.time.LocalDateTime;
// import java.util.Collections;

// import static org.junit.jupiter.api.Assertions.*;
// import static org.mockito.Mockito.*;

// public class FraudRulesEngineTest {
//     private TransactionsRepository transactionsRepository;
//     private FraudRulesEngine fraudRulesEngine;

//     @BeforeEach
//     void setUp() {
//         transactionsRepository = mock(TransactionsRepository.class);
//         fraudRulesEngine = new FraudRulesEngine(transactionsRepository);
//     }

//     @Test
//     void testVelocityCheck() {
//         Transaction tx = baseTransaction();
//         when(transactionsRepository.findByUserIdAndCreatedAtAfter(anyLong(), any())).thenReturn(Collections.nCopies(6, tx));
//         FraudCheckResult result = fraudRulesEngine.applyRules(tx);
//         assertTrue(result.isSuspicious());
//         assertTrue(result.triggeredRules().contains("Velocity Check"));
//         assertEquals(FraudRiskLevel.MEDIUM, result.riskLevel());
//     }

//     @Test
//     void testAmountSpike() {
//         Transaction tx = baseTransaction();
//         tx.setAmount(BigDecimal.valueOf(1000));
//         when(transactionsRepository.findByUserId(anyLong())).thenReturn(Collections.singletonList(new Transaction() {{ setAmount(BigDecimal.valueOf(100)); }}));
//         FraudCheckResult result = fraudRulesEngine.applyRules(tx);
//         assertTrue(result.isSuspicious());
//         assertTrue(result.triggeredRules().contains("Amount Spike"));
//         assertEquals(FraudRiskLevel.CRITICAL, result.riskLevel());
//     }

//     private Transaction baseTransaction() {
//         Transaction tx = new Transaction();
//         tx.setUserId(1L);
//         tx.setAmount(BigDecimal.valueOf(100));
//         tx.setCurrency("USD");
//         tx.setDeviceId("device123");
//         tx.setIpAddress("1.2.3.4");
//         tx.setBillingAddress("123 Main St");
//         tx.setStatus(TransactionStatus.PENDING);
//         tx.setCreatedAt(LocalDateTime.now());
//         tx.setUpdatedAt(LocalDateTime.now());
//         return tx;
//     }
// } 
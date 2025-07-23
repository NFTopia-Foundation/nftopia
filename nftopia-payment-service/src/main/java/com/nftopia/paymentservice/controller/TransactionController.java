package com.nftopia.paymentservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import javax.validation.Valid;
import javax.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import com.nftopia.paymentservice.dto.*;
import com.nftopia.paymentservice.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.nftopia.paymentservice.exception.TransactionNotFoundException;
import com.nftopia.paymentservice.exception.EscrowUpdateException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestController
@RequestMapping("/api/transactions")
@Validated
@Tag(name = "Transactions", description = "Transaction operations API")
public class TransactionController {
    @Autowired
    private TransactionService transactionService;

    @Operation(summary = "Create new transaction")
    @PostMapping
    public ResponseEntity<TransactionResponse> createTransaction(
            @Valid @RequestBody CreateTransactionRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        try {
            TransactionResponse response = transactionService.createTransaction(request, idempotencyKey);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @Operation(summary = "Get transaction details")
    @GetMapping("/{id}")
    public ResponseEntity<TransactionResponse> getTransaction(@PathVariable UUID id) {
        try {
            TransactionResponse response = transactionService.getTransaction(id);
            return ResponseEntity.ok(response);
        } catch (NoSuchElementException | RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found");
        }
    }

    @Operation(summary = "Filter transactions")
    @GetMapping
    public Page<TransactionResponse> getTransactions(
            @RequestParam(required = false) UUID nftId,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) TransactionStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return transactionService.getTransactions(nftId, userId, status, page, size);
    }

    @Operation(summary = "Update escrow status")
    @PatchMapping("/{id}/escrow")
    public ResponseEntity<TransactionResponse> updateEscrowStatus(
            @PathVariable UUID id,
            @Valid @RequestBody EscrowDetailsDTO escrowDetails) {
        try {
            TransactionResponse response = transactionService.updateEscrowStatus(id, escrowDetails);
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }
}

@RestControllerAdvice
class TransactionControllerAdvice {
    @ExceptionHandler(TransactionNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(TransactionNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        problem.setTitle("Transaction Not Found");
        problem.setDetail(ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(EscrowUpdateException.class)
    public ResponseEntity<ProblemDetail> handleEscrowUpdate(EscrowUpdateException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Escrow Update Failed");
        problem.setDetail(ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }
} 
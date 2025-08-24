package com.nftopia.paymentservice.controller;

import com.nftopia.paymentservice.dto.CreateTransactionRequest;
import com.nftopia.paymentservice.dto.EscrowDetailsDTO;
import com.nftopia.paymentservice.dto.TransactionFilter;
import com.nftopia.paymentservice.dto.TransactionResponse;
import com.nftopia.paymentservice.service.TransactionService;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService service;

    public TransactionController(TransactionService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponse create(@Valid @RequestBody CreateTransactionRequest request) {
        return service.createTransaction(request);
    }

    @GetMapping("/{id}")
    public TransactionResponse getById(@PathVariable UUID id) {
        return service.getTransaction(id);
    }

    @GetMapping
    public Page<TransactionResponse> filter(
        @ParameterObject TransactionFilter filter,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return service.filterTransactions(filter, PageRequest.of(page, size));
    }

    @PatchMapping("/{id}/escrow")
    public TransactionResponse updateEscrow(@PathVariable UUID id,
                                            @Valid @RequestBody EscrowDetailsDTO escrow) {
        return service.updateEscrow(id, escrow);
    }
}



///Test on Postman
/// Authorization: Username: admin, Password: secret
// POST /api/transactions
// {
//   "buyerId": "550e8400-e29b-41d4-a716-446655440000",
//   "sellerId": "550e8400-e29b-41d4-a716-446655440111",
//   "nftId": "550e8400-e29b-41d4-a716-446655850222",
//   "auctionId": "550e8400-e29b-41d4-a716-446655440333",
//   "amount": 150.50,
//   "idempotencyKey": "550e8400-e29b-41d4-a716-786655440000",
//   "receiverId": "a7e6b18d-3c21-4b7c-bb89-2f5632e7c5c2",
//   "paymentMethod": "CRYPTO_STRK",
//   "transactionHash": "0xabc123456789"
// }

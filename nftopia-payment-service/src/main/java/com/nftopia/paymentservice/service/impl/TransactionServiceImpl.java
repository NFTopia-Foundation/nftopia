package com.nftopia.paymentservice.service.impl;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

import org.hibernate.exception.ConstraintViolationException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.nftopia.paymentservice.dto.CreateTransactionRequest;
import com.nftopia.paymentservice.dto.EscrowDetailsDTO;
import com.nftopia.paymentservice.dto.TransactionFilter;
import com.nftopia.paymentservice.dto.TransactionResponse;
import com.nftopia.paymentservice.entity.Transaction;
import com.nftopia.paymentservice.entity.enums.TransactionStatus;
import com.nftopia.paymentservice.exception.NotFoundException;
import com.nftopia.paymentservice.repository.TransactionRepository;
import com.nftopia.paymentservice.service.IdempotencyService;
import com.nftopia.paymentservice.service.TransactionService;
import com.nftopia.paymentservice.service.spec.TransactionSpecifications;
import com.nftopia.paymentservice.utils.ExplorerUrlBuilder;

@Service
public class TransactionServiceImpl implements TransactionService {

    private final TransactionRepository repository;
    private final IdempotencyService idempotencyService;
    private final ExplorerUrlBuilder explorerUrlBuilder;

    public TransactionServiceImpl(TransactionRepository repository,
                                  IdempotencyService idempotencyService,
                                  ExplorerUrlBuilder explorerUrlBuilder) {
        this.repository = repository;
        this.idempotencyService = idempotencyService;
        this.explorerUrlBuilder = explorerUrlBuilder;
    }

    @Autowired 
    WebClient webClient; 

   
    @Override
    public TransactionResponse createTransaction(CreateTransactionRequest req) {
    Supplier<TransactionResponse> lambda = () -> {
        Transaction tx = new Transaction();
        tx.setBuyerId(req.receiverId());
        tx.setAuctionId(req.auctionId());
        tx.setTransactionHash(req.transactionHash());
        tx.setSellerId(resolveSellerId(req.nftId()));
        tx.setNftId(req.nftId());
        tx.setAmount(req.amount().setScale(18, BigDecimal.ROUND_UNNECESSARY));
        tx.setPaymentMethod(req.paymentMethod());
        tx.setStatus(TransactionStatus.PENDING);
        tx.setEscrowDetails(toEscrowJson(req.escrowDetails()));
        tx.setIdempotencyKey(req.idempotencyKey());

        Transaction saved = repository.save(tx);
        return this.toResponse(saved);
    };

    try {
        return idempotencyService.execute(req.idempotencyKey(), lambda);
    } catch (DataIntegrityViolationException e) {
        throw new IllegalStateException(
            "Transaction with hash " + req.transactionHash() + " already exists.", e
        );
    } catch (ConstraintViolationException e) {
        throw new IllegalArgumentException("Invalid input: " + e.getMessage(), e);
    } 
}


    @Override
    public TransactionResponse getTransaction(UUID id) {
        Transaction tx = repository.findById(id)
            .orElseThrow(() -> new NotFoundException("Transaction not found"));
  
      return this.toResponse(tx);
    }

   
    @Override
    public Page<TransactionResponse> filterTransactions(TransactionFilter filter, Pageable pageable) {
    // start with a base "always true" specification
    Specification<Transaction> spec = (root, query, cb) -> cb.conjunction();

    if (filter.nftId() != null) {
        spec = spec.and(TransactionSpecifications.hasNftId(filter.nftId()));
    }
    if (filter.userId() != null) {
        spec = spec.and(TransactionSpecifications.hasUserId(filter.userId()));
    }
    if (filter.status() != null) {
        spec = spec.and(TransactionSpecifications.hasStatus(filter.status()));
    }

    return repository.findAll(spec, pageable).map(this::toResponse);
}

    @Override
    public TransactionResponse updateEscrow(UUID id, EscrowDetailsDTO escrowDetails) {
        Transaction tx = repository.findById(id).orElseThrow(() -> new NotFoundException("Transaction not found"));
        tx.setEscrowDetails(toEscrowJson(escrowDetails));
        Transaction saved = repository.save(tx);
        return toResponse(saved);
    }

    private Map<String, Object> toEscrowJson(EscrowDetailsDTO dto) {
        if (dto == null) return null;
        Map<String, Object> m = new HashMap<>();
        m.put("releaseDate", dto.releaseDate());
        m.put("conditions", dto.conditions());
        return m;
    }

    private UUID resolveSellerId(UUID nftId) {
    return webClient.get()
            .uri("http://localhost:9000/nfts/{id}/owner", nftId)
            .retrieve()
            .bodyToMono(UUID.class)
            .onErrorReturn(UUID.randomUUID())   // fallback on error
            .block();
}



    private TransactionResponse toResponse(Transaction t) {
        String explorerUrl = t.getTransactionHash() == null ? null : explorerUrlBuilder.tx(t.getTransactionHash());
        return new TransactionResponse(t.getId(), t.getStatus(), t.getCreatedAt(), explorerUrl);
    }
}

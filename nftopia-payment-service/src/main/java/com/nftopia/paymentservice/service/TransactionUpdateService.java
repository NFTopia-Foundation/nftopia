package com.nftopia.paymentservice.service;

import com.nftopia.paymentservice.dto.StarknetTransactionEvent;

public interface TransactionUpdateService {
    void updateTransactionStatus(StarknetTransactionEvent event);
}

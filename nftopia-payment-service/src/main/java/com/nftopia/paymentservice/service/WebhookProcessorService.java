package com.nftopia.paymentservice.service;

import com.nftopia.paymentservice.dto.StarknetTransactionEvent;

public interface WebhookProcessorService {
    void verifyAndProcess(String signature, StarknetTransactionEvent event);
}

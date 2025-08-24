package com.nftopia.paymentservice.service;

import com.nftopia.paymentservice.dto.StarknetTransactionEvent;

public interface SignatureVerifier {
    boolean verify(String signature, StarknetTransactionEvent event);
}

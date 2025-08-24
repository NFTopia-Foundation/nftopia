package com.nftopia.paymentservice.service;

import java.util.function.Supplier;

public interface IdempotencyService {
    <T> T execute(String key, Supplier<T> supplier);
}

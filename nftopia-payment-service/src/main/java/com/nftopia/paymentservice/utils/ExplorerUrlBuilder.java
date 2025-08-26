package com.nftopia.paymentservice.utils;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ExplorerUrlBuilder {

    @Value("${chain.explorer.tx:https://starkscan.co/tx/}")
    private String base;

    public String tx(String hash) {
        return base + hash;
    }
}

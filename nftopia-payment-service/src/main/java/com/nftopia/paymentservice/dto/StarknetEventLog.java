package com.nftopia.paymentservice.dto;

import java.util.Map;

public class StarknetEventLog {

    private String contractAddress;
    private String eventType;
    private Map<String, String> data;

    public StarknetEventLog() {}

    public String getContractAddress() {
        return this.contractAddress;
    }

    public void setContractAddress(String contractAddress) {
        this.contractAddress = contractAddress;
    }

    public String getEventType() {
        return this.eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public Map<String, String> getData() {
        return this.data;
    }

    public void setData(Map<String, String> data) {
        this.data = data;
    }
}

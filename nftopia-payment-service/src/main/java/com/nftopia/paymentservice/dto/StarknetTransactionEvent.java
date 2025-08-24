package com.nftopia.paymentservice.dto;

import java.util.List;
import java.util.Date;


import com.nftopia.paymentservice.entity.enums.TransactionStatus;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class StarknetTransactionEvent {

    @NotBlank
    private String txHash;

    @NotNull
    private TransactionStatus status;

    @NotNull
    private Date blockTimestamp;

    @Positive
    private Long blockNumber;

    @Valid
    private List<StarknetEventLog> logs;

    public StarknetTransactionEvent() {}

    public String getTxHash() {
        return this.txHash;
    }

    public void setTxHash(String txHash) {
        this.txHash = txHash;
    }

    public TransactionStatus getStatus() {
        return this.status;
    }

    public void setStatus(TransactionStatus status) {
        this.status = status;
    }

    public Date getBlockTimestamp() {
        return this.blockTimestamp;
    }

    public void setBlockTimestamp(Date blockTimestamp) {
        this.blockTimestamp = blockTimestamp;
    }

    public Long getBlockNumber() {
        return this.blockNumber;
    }

    public void setBlockNumber(Long blockNumber) {
        this.blockNumber = blockNumber;
    }

    public List<StarknetEventLog> getLogs() {
        return this.logs;
    }

    public void setLogs(List<StarknetEventLog> logs) {
        this.logs = logs;
    }
}

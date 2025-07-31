package com.nftopia.paymentservice.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiError {
    private String type;
    private String title;
    private int status;
    private String detail;
    private String instance;
    private Instant timestamp = Instant.now();

    public ApiError(String type, String title, int status, String detail, String instance) {
        this.type = type;
        this.title = title;
        this.status = status;
        this.detail = detail;
        this.instance = instance;
    }
    // Getters and setters omitted for brevity
} 
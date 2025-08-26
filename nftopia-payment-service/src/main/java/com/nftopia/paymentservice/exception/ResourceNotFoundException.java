package com.nftopia.paymentservice.exception;

/**
 * Custom exception for signaling 404 errors.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }

     public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
    
   
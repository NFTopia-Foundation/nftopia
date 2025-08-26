package com.nftopia.paymentservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import com.nftopia.paymentservice.dto.StarknetTransactionEvent;
import com.nftopia.paymentservice.service.SignatureVerifier;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

@Service
public class SignatureVerifierImpl implements SignatureVerifier {

    private static final String HMAC_ALGO = "HmacSHA256";
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Injected from application.properties or secrets manager
    private final String secretKey = "replace_with_real_secret";

    @Override
    public boolean verify(String signature, StarknetTransactionEvent event) {
        try {
            byte[] payload = objectMapper.writeValueAsBytes(event);

            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(secretKey.getBytes(), HMAC_ALGO));
            byte[] expected = mac.doFinal(payload);

            String expectedSignature = Base64.getEncoder().encodeToString(expected);
            System.out.println("Expected Signature: " + expectedSignature);
            return expectedSignature.equals(signature);
        } catch (Exception e) {
            System.err.println("Signature verification failed: " + e.getMessage());
            return false;
        }
    }
}

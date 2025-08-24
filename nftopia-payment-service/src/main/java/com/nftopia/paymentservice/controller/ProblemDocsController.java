package com.nftopia.paymentservice.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves simple documentation for problem type URIs.
 * Optional, but makes the ProblemDetail.type links resolvable.
 */
@RestController
@RequestMapping("/problems")
public class ProblemDocsController {

    @GetMapping("/validation")
    public String validationDoc() {
        return "Validation failed: Your request body did not meet required constraints.";
    }

    @GetMapping("/not-found")
    public String notFoundDoc() {
        return "The requested resource was not found.";
    }

    @GetMapping("/internal-error")
    public String internalErrorDoc() {
        return "An unexpected server error occurred. Please contact support.";
    }
}

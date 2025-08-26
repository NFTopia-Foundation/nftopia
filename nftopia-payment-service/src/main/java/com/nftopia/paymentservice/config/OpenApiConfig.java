package com.nftopia.paymentservice.config;

import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI api() {
        return new OpenAPI()
            .info(new Info()
                .title("NFTopia Payment Service API")
                .version("v1")
                .description("Transactions & Escrow API"))
            .externalDocs(new ExternalDocumentation()
                .description("NFTopia Docs")
                .url("https://nftopia-frontend.vercel.app"));
    }
}

package com.nftopia.paymentservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import io.github.cdimascio.dotenv.Dotenv;


@SpringBootApplication
public class NFTopiaPaymentServiceApplication {

	public static void main(String[] args) {

		Dotenv dotenv = Dotenv.load();
		
        System.setProperty("DB_PASSWORD", dotenv.get("DB_PASSWORD"));
        System.setProperty("DB_USERNAME", dotenv.get("DB_USERNAME"));
        System.setProperty("DB_URL", dotenv.get("DB_URL"));

		SpringApplication.run(NFTopiaPaymentServiceApplication.class, args);

		System.out.println("NFTopia Payment Service is currently running on port 9003");
	}

}

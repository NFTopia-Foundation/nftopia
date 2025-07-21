# NFTopia Payment Service

The **NFTopia Payment Service** is a Spring Boot microservice handling all payment processing for NFT minting and marketplace transactions. Running on port `9003`, it supports multi-currency payments, escrow services, and royalty distributions.

---

## 🔗 API Documentation  
[View Swagger Docs](http://localhost:9003/swagger-ui.html) | [API Reference](http://localhost:9003/v3/api-docs)

---

## ✨ Payment Features  
- **Multi-Currency Support**:  
  - 💰 Crypto: ETH, USDC, STRK  
  - 💳 Fiat: Credit card processing (Stripe)  
- **Escrow Services**:  
  - Secure NFT sale settlements  
  - Dispute resolution mechanisms  
- **Royalty Automation**:  
  - Instant creator payouts  
  - Secondary sale royalties  
- **Fraud Prevention**:  
  - Transaction monitoring  
  - Velocity checks  

---

## 🛠️ Tech Stack  
| Component           | Technology                                                                 |
|---------------------|---------------------------------------------------------------------------|
| Framework           | [Spring Boot 3.2](https://spring.io/projects/spring-boot)                |
| Security           | Spring Security + JWT                                                    |
| Crypto Payments    | [Web3j](https://docs.web3j.io/)                                         |
| Fiat Payments      | [Stripe API](https://stripe.com/docs/api)                               |
| Database           | PostgreSQL + [Hibernate](https://hibernate.org/)                         |

---

## 🚀 Quick Start  

### Prerequisites  
- Java 17+  
- PostgreSQL 15+  
- Maven 3.9+  
- Stripe account (for fiat payments)  

### Installation  
1. **Clone the repo**:  
   ```bash
   git clone https://github.com/NFTopia-Foundation/nftopia-payment-service.git
   cd nftopia-payment-service
   ```
2. Configure environment:
   ```bash
   cp src/main/resources/application.example.yml src/main/resources/application.yml
   ```
   - Edit application.yml:
     ```yaml
     server:
       port: 9003
     spring:
       datasource:
         url: jdbc:postgresql://localhost:5432/nftopia_payments
     stripe:
       api-key: your-stripe-key
     ```
3. Build and run:
   ```bash
   mvn spring-boot:run
   ```
## 🤝 Contributing

1. Fork the repository
2. Create your feature branch:
```bash
git checkout -b feat/your-feature
```
3. Commit changes following Conventional Commits
4. Push to the branch
5. Open a Pull Request

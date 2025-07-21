# NFTopia Marketplace Service

The **NFTopia Marketplace Service** is a Laravel-powered microservice handling all marketplace operations for NFT trading. It provides secure listing management, bidding systems, and NFT discovery features.

---

## 🔗 API Documentation  
[View API Docs](http://localhost:9004/api/documentation) | [Postman Collection](docs/NFTopia-Marketplace-API.postman_collection.json)

---

## ✨ Marketplace Features  
- **NFT Listings**:  
  - 🖼️ Fixed-price and auction listings  
  - ⏱️ Time-limited auctions  
  - 🔄 Bulk listing management  
- **Trading Engine**:  
  - 💰 Real-time bidding system  
  - 🤝 Offer negotiation  
  - 📊 Price history tracking  
- **Discovery**:  
  - 🔍 Advanced search filters  
  - 🏆 Collection rankings  
  - 💎 Featured NFTs  

---

## 🛠️ Tech Stack  
| Component           | Technology                                                                 |
|---------------------|---------------------------------------------------------------------------|
| Framework           | [Laravel 10](https://laravel.com/docs/10.x)                              |
| API                 | Laravel Sanctum (Authentication)                                         |
| Database           |  PostgreSQL 15 + [Eloquent ORM](https://laravel.com/docs/10.x/eloquent)        |
| Search             | [Laravel Scout](https://laravel.com/docs/10.x/scout) + [PGroonga](https://pgroonga.github.io/) (for full-text search)         |
| Events             | [Laravel Echo](https://laravel.com/docs/10.x/broadcasting) + WebSockets  |

---

## 🚀 Quick Start  

### Prerequisites  
- PHP 8.2+  
- PostgreSQL 15+  
- Composer 2.5+  
- Redis (for caching/queues)  

### Installation  
1. **Clone the repo**:  
   ```bash
   git clone https://github.com/NFTopia-Foundation/nftopia-marketplace-service.git
   cd nftopia-marketplace-service
   ```
2. Install dependencies:
   ```bash
   composer install
   ```
3. Configure environment:
   ```bash
   cp .env.example .env
   ```
4. Generate keys:
   ```bash
   php artisan key:generate
   php artisan jwt:secret
   ```
5. Run migrations:
   ```bash
   php artisan migrate --seed
   ```
6. Start the service:
   ```bash
   php artisan serve --port=9004
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

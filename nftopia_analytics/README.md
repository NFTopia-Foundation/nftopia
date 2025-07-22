# NFTopia Analytics Service

The **NFTopia Analytics Service** is a Django-powered microservice that processes and visualizes platform analytics data. Running on port `9002`, it provides actionable insights for NFT trading, user behavior, and market trends.

---

## 🔗 API Documentation  
[View Swagger Docs](http://localhost:9002/api/docs) | [Grafana Dashboard](http://localhost:9002/grafana)

---

## ✨ Analytics Features  
- **Real-time Data Processing**:  
  - 📊 NFT trading volume analytics  
  - 👥 User engagement metrics  
  - 📈 Market trend analysis  
- **Custom Reports**:  
  - Collection performance  
  - Creator royalty tracking  
  - Gas fee optimization insights  
- **Data Export**: CSV/JSON endpoints for all datasets  
- **Anomaly Detection**: AI-powered unusual activity alerts  

---

## 🛠️ Tech Stack  
| Component           | Technology                                                                 |
|---------------------|---------------------------------------------------------------------------|
| Framework           | [Django 4.2](https://www.djangoproject.com/) + [Django REST Framework](https://www.django-rest-framework.org/) |
| Database           | PostgreSQL + [TimescaleDB](https://www.timescale.com/) (for time-series) |
| Visualization      | [Grafana](https://grafana.com/)                                         |
| Analytics Engine   | [Pandas](https://pandas.pydata.org/) + [NumPy](https://numpy.org/)      |
| Event Processing   | [Apache Kafka](https://kafka.apache.org/)                               |

---

## 🚀 Quick Start  

### Prerequisites  
- Python 3.10+  
- PostgreSQL 14+  
- TimescaleDB extension  
- Kafka broker  

### Installation  
1. **Clone the repo**:  
   ```bash
   git clone https://github.com/NFTopia-Foundation/nftopia.git
   cd nftopia_analytics
   ```
2. Setup virtual environment:
   ```bash
   python -m venv ven
   source venv/bin/activate  # Linux/Mac
   venv\Scripts\activate    # Windows
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment:
   ```bash
   cp .env.example .env
   ```
5. Run migrations:
   ```bash
   python manage.py migrate
   ```
6. Start the service:
   ```bash
   python manage.py runserver 9002
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


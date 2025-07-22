# NFTopia Notifications Service

The **NFTopia Notifications Service** is an Express.js microservice handling all notification delivery for the NFTopia platform. It supports SMS, email, in-app, and webhook notifications with TypeScript robustness.

---

## 🔗 API Documentation  
[View Swagger Docs](http://localhost:9001/api-docs) (Available when running locally)

---

## ✨ Notification Features  
- **Multi-Channel Delivery**:  
  - 📧 Email (SendGrid/Mailgun)  
  - 📱 SMS (Twilio)  
  - 🔔 In-App (WebSocket)  
  - 🌐 Webhook (Custom endpoints)  
- **Template Management**: Handlebars templates for consistent messaging  
- **Rate Limiting**: Protect against notification spam  
- **Delivery Tracking**: Status webhooks for all notifications  

---

## 🛠️ Tech Stack  
| Component           | Technology                                                                 |
|---------------------|---------------------------------------------------------------------------|
| Framework           | [Express.js](https://expressjs.com/) (TypeScript)                        |
| Email              | [Nodemailer](https://nodemailer.com/) + [SendGrid](https://sendgrid.com/)|
| SMS                | [Twilio](https://www.twilio.com/)                                        |
| WebSockets         | [Socket.io](https://socket.io/)                                          |
| Queue              | [BullMQ](https://docs.bullmq.io/) (Redis-backed)                         |
| Validation         | [Zod](https://zod.dev/)                                                 |

---

## 🚀 Quick Start  

### Prerequisites  
- Node.js v18+  
- Redis (for queues)  
- SMTP credentials (or SendGrid API key)  
- Twilio account (for SMS)  

### Installation  
1. **Clone the repo**:  
   ```bash
   git clone https://github.com/NFTopia-Foundation/nftopia.git
   cd nftopia-notifications-service
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Setup environment:
   ```bash
   cp .env.example .env
   ```
4. Start the service:
   ```bash
   pnpm dev  # http://localhost:9001
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

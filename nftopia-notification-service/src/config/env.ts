import dotenv from "dotenv";
dotenv.config();

export default {
  PORT: process.env.PORT || 3002,
  NODE_ENV: process.env.NODE_ENV || "development",
  emailRetry: {
    maxAttempts: parseInt(process.env.EMAIL_RETRY_MAX_ATTEMPTS || "3", 10),
    delays: [
      parseInt(process.env.EMAIL_RETRY_DELAY_1 || "300000", 10), // 5 minutes
      parseInt(process.env.EMAIL_RETRY_DELAY_2 || "1800000", 10), // 30 minutes
      parseInt(process.env.EMAIL_RETRY_DELAY_3 || "3600000", 10), // 1 hour
    ],
    suppressionDuration: parseInt(
      process.env.EMAIL_SUPPRESSION_DURATION || "86400000",
      10
    ), // 24 hours
  },
  MONGO_URI:
    process.env.MONGO_URI || "mongodb://localhost:27017/nftopia-notifications",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || "nftopia-notifications",
  BASE_URL: process.env.BASE_URL || "http://localhost:3000",
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || "gmail",
  EMAIL_FROM: process.env.EMAIL_FROM || "noreply@nftopia.com",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "twilio_account_sid",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "twilio_auth_token",
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  JWT_SECRET: process.env.JWT_SECRET || "supersecretkey",
};
